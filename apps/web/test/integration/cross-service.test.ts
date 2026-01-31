/**
 * Cross-service integration tests.
 * Tests real Go scheduling service communication with the TypeScript app.
 * Requires Go 1.24+ installed on the system.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
  getTestDatabaseUrl,
  type TestDatabase,
} from '../helpers/db';
import {
  createAdminCaller,
  testUsers,
} from '../helpers/trpc';
import {
  createUser,
  createClient,
  createEvent,
  createTask,
  createResource,
  createResourceSchedule,
  resetFactoryCounter,
} from '../helpers/factories';
import { buildGoService, startGoService, stopGoService, getServiceUrl } from './setup';

describe('Cross-Service Integration', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    // Set up test database (Testcontainers PostgreSQL)
    db = await setupTestDatabase();

    // Build and start the real Go scheduling service
    buildGoService();
    const dbUrl = getTestDatabaseUrl();
    const port = await startGoService(dbUrl);

    // Point the scheduling client at the test Go service
    process.env.SCHEDULING_SERVICE_URL = `http://localhost:${port}`;
  }, 120000); // 2 minutes for build + start

  afterAll(async () => {
    await stopGoService();
    await teardownTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await cleanDatabase(db);
    resetFactoryCounter();

    // Create test users (admin=1, manager=2)
    await createUser(db, {
      email: testUsers.admin.email,
      name: testUsers.admin.name as string,
      role: testUsers.admin.role,
    });
    await createUser(db, {
      email: testUsers.manager.email,
      name: testUsers.manager.name as string,
      role: testUsers.manager.role,
    });
  });

  // ============================================
  // Direct Go Service API Tests
  // ============================================

  describe('conflict detection via Go service', () => {
    it('detects overlapping resource assignment', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1, { eventName: 'Event A' });
      const resource = await createResource(db, { name: 'Head Chef', type: 'staff' });

      // Create an existing schedule entry (9AM-5PM)
      await createResourceSchedule(
        db,
        resource.id,
        event.id,
        new Date('2026-03-01T09:00:00Z'),
        new Date('2026-03-01T17:00:00Z')
      );

      // Check for conflict with overlapping time (1PM-9PM)
      const url = getServiceUrl();
      const response = await fetch(`${url}/api/v1/scheduling/check-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_ids: [resource.id],
          start_time: '2026-03-01T13:00:00Z',
          end_time: '2026-03-01T21:00:00Z',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.has_conflicts).toBe(true);
      expect(data.conflicts).toHaveLength(1);
      expect(data.conflicts[0].resource_id).toBe(resource.id);
    });

    it('allows non-overlapping resource assignment', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1, { eventName: 'Event B' });
      const resource = await createResource(db, { name: 'Sous Chef', type: 'staff' });

      // Create an existing schedule entry (9AM-12PM)
      await createResourceSchedule(
        db,
        resource.id,
        event.id,
        new Date('2026-03-01T09:00:00Z'),
        new Date('2026-03-01T12:00:00Z')
      );

      // Check for conflict with non-overlapping time (1PM-5PM)
      const url = getServiceUrl();
      const response = await fetch(`${url}/api/v1/scheduling/check-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_ids: [resource.id],
          start_time: '2026-03-01T13:00:00Z',
          end_time: '2026-03-01T17:00:00Z',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.has_conflicts).toBe(false);
    });

    it('handles multiple resources with mixed conflict/clear', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const chef = await createResource(db, { name: 'Chef', type: 'staff' });
      const oven = await createResource(db, { name: 'Oven', type: 'equipment' });

      // Chef has existing schedule, oven does not
      await createResourceSchedule(
        db,
        chef.id,
        event.id,
        new Date('2026-03-01T09:00:00Z'),
        new Date('2026-03-01T17:00:00Z')
      );

      const url = getServiceUrl();
      const response = await fetch(`${url}/api/v1/scheduling/check-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_ids: [chef.id, oven.id],
          start_time: '2026-03-01T10:00:00Z',
          end_time: '2026-03-01T14:00:00Z',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.has_conflicts).toBe(true);
      // Only chef should have conflicts
      const conflictResourceIds = data.conflicts.map((c: { resource_id: number }) => c.resource_id);
      expect(conflictResourceIds).toContain(chef.id);
      expect(conflictResourceIds).not.toContain(oven.id);
    });
  });

  describe('resource availability via Go service', () => {
    it('returns schedule entries for date range', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1, { eventName: 'Availability Event' });
      const resource = await createResource(db, { name: 'Banquet Server', type: 'staff' });

      // Create a schedule entry
      await createResourceSchedule(
        db,
        resource.id,
        event.id,
        new Date('2026-03-01T09:00:00Z'),
        new Date('2026-03-01T17:00:00Z')
      );

      const url = getServiceUrl();
      const params = new URLSearchParams({
        resource_id: String(resource.id),
        start_date: '2026-03-01T00:00:00Z',
        end_date: '2026-03-02T00:00:00Z',
      });

      const response = await fetch(`${url}/api/v1/scheduling/resource-availability?${params}`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.resource_id).toBe(resource.id);
      expect(data.entries).toHaveLength(1);
    });

    it('returns empty entries for unscheduled resource', async () => {
      const resource = await createResource(db, { name: 'Idle Server', type: 'staff' });

      const url = getServiceUrl();
      const params = new URLSearchParams({
        resource_id: String(resource.id),
        start_date: '2026-03-01T00:00:00Z',
        end_date: '2026-03-02T00:00:00Z',
      });

      const response = await fetch(`${url}/api/v1/scheduling/resource-availability?${params}`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.entries).toHaveLength(0);
    });
  });

  // ============================================
  // End-to-End tRPC → Go Service Tests
  // ============================================

  describe('end-to-end: tRPC assignResources → Go conflict check → DB write', () => {
    it('assigns resources when no conflicts exist', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id, { title: 'Setup tables' });
      const resource = await createResource(db, { name: 'Waiter', type: 'staff' });

      const result = await caller.task.assignResources({
        taskId: task.id,
        resourceIds: [resource.id],
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T17:00:00Z'),
        force: false,
      });

      expect(result.success).toBe(true);
      expect(result.assignedResources).toBe(1);

      // Verify resource was actually assigned in DB
      const assigned = await caller.task.getAssignedResources({ taskId: task.id });
      expect(assigned).toHaveLength(1);
      expect(assigned[0].resource.id).toBe(resource.id);
    });

    it('blocks assignment when real Go service detects conflict', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task1 = await createTask(db, event.id, { title: 'Morning setup' });
      const task2 = await createTask(db, event.id, { title: 'Afternoon setup' });
      const resource = await createResource(db, { name: 'Head Chef', type: 'staff' });

      // Assign resource to task1 (9AM-5PM) - this creates a schedule entry
      const firstAssign = await caller.task.assignResources({
        taskId: task1.id,
        resourceIds: [resource.id],
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T17:00:00Z'),
        force: false,
      });
      expect(firstAssign.success).toBe(true);

      // Try to assign same resource to task2 (overlapping: 1PM-9PM)
      const secondAssign = await caller.task.assignResources({
        taskId: task2.id,
        resourceIds: [resource.id],
        startTime: new Date('2026-04-01T13:00:00Z'),
        endTime: new Date('2026-04-01T21:00:00Z'),
        force: false,
      });

      expect(secondAssign.success).toBe(false);
      expect(secondAssign.conflicts).toBeDefined();
      expect(secondAssign.conflicts?.length).toBeGreaterThan(0);
    });

    it('force overrides conflict detected by real Go service', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task1 = await createTask(db, event.id, { title: 'Priority task' });
      const task2 = await createTask(db, event.id, { title: 'Override task' });
      const resource = await createResource(db, { name: 'VIP Chef', type: 'staff' });

      // First assignment
      await caller.task.assignResources({
        taskId: task1.id,
        resourceIds: [resource.id],
        startTime: new Date('2026-04-01T09:00:00Z'),
        endTime: new Date('2026-04-01T17:00:00Z'),
        force: false,
      });

      // Force second overlapping assignment
      const result = await caller.task.assignResources({
        taskId: task2.id,
        resourceIds: [resource.id],
        startTime: new Date('2026-04-01T13:00:00Z'),
        endTime: new Date('2026-04-01T21:00:00Z'),
        force: true,
      });

      expect(result.success).toBe(true);
      expect(result.forceOverride).toBe(true);

      // Verify resource is now assigned to task2
      const assigned = await caller.task.getAssignedResources({ taskId: task2.id });
      expect(assigned).toHaveLength(1);
    });
  });
});
