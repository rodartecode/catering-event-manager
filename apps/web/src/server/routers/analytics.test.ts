import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
  type TestDatabase,
} from '../../../test/helpers/db';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';
import {
  createUser,
  createClient,
  createEvent,
  createTask,
  createResource,
  createResourceSchedule,
  resetFactoryCounter,
} from '../../../test/helpers/factories';

describe('analytics router', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
    resetFactoryCounter();

    // Create test users (admin=1, manager=2)
    await createUser(db, {
      email: testUsers.admin.email,
      name: testUsers.admin.name!,
      role: testUsers.admin.role,
    });
    await createUser(db, {
      email: testUsers.manager.email,
      name: testUsers.manager.name!,
      role: testUsers.manager.role,
    });
  });

  // ============================================
  // Event Completion Analytics (FR-024)
  // ============================================

  describe('analytics.eventCompletion', () => {
    it('returns completion stats for date range', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);

      // Create events with different statuses
      await createEvent(db, client.id, 1, { status: 'completed' });
      await createEvent(db, client.id, 1, { status: 'planning' });
      await createEvent(db, client.id, 1, { status: 'inquiry' });

      const result = await caller.analytics.eventCompletion({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2030-12-31'),
      });

      expect(result.totalEvents).toBe(3);
      expect(result.completedEvents).toBe(1);
      expect(result.completionRate).toBeGreaterThanOrEqual(0);
      expect(result.byStatus).toBeDefined();
      expect(Array.isArray(result.byStatus)).toBe(true);
    });

    it('returns zero stats when no events in range', async () => {
      const caller = createManagerCaller(db);

      const result = await caller.analytics.eventCompletion({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2020-12-31'),
      });

      expect(result.totalEvents).toBe(0);
      expect(result.completedEvents).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    it('excludes archived events', async () => {
      const adminCaller = createAdminCaller(db);
      const client = await createClient(db);

      // Create and archive an event
      const event = await createEvent(db, client.id, 1, { status: 'completed' });
      await adminCaller.event.archive({ id: event.id });

      const managerCaller = createManagerCaller(db);
      const result = await managerCaller.analytics.eventCompletion({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2030-12-31'),
      });

      expect(result.totalEvents).toBe(0);
    });

    it('includes follow_up status as completed', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);

      await createEvent(db, client.id, 1, { status: 'follow_up' });

      const result = await caller.analytics.eventCompletion({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2030-12-31'),
      });

      expect(result.completedEvents).toBe(1);
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.analytics.eventCompletion({
          dateFrom: new Date('2020-01-01'),
          dateTo: new Date('2020-12-31'),
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });

  // ============================================
  // Resource Utilization Analytics (FR-025)
  // ============================================

  describe('analytics.resourceUtilization', () => {
    it('returns utilization for all resources', async () => {
      const caller = createManagerCaller(db);
      await createResource(db, { name: 'Chef', type: 'staff' });
      await createResource(db, { name: 'Oven', type: 'equipment' });

      const result = await caller.analytics.resourceUtilization({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2030-12-31'),
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        resourceName: expect.any(String),
        resourceType: expect.any(String),
        assignedTasks: expect.any(Number),
        totalHoursAllocated: expect.any(Number),
        utilizationPercentage: expect.any(Number),
      });
    });

    it('filters by resource type', async () => {
      const caller = createManagerCaller(db);
      await createResource(db, { name: 'Chef', type: 'staff' });
      await createResource(db, { name: 'Oven', type: 'equipment' });

      const result = await caller.analytics.resourceUtilization({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2030-12-31'),
        resourceType: 'staff',
      });

      expect(result).toHaveLength(1);
      expect(result[0].resourceType).toBe('staff');
    });

    it('calculates utilization from schedule entries', async () => {
      const caller = createManagerCaller(db);
      const resource = await createResource(db, { name: 'Busy Chef', type: 'staff' });
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      // Create schedule entry
      const startTime = new Date('2025-06-15T09:00:00Z');
      const endTime = new Date('2025-06-15T17:00:00Z'); // 8 hours
      await createResourceSchedule(db, resource.id, event.id, startTime, endTime);

      const result = await caller.analytics.resourceUtilization({
        dateFrom: new Date('2025-06-01'),
        dateTo: new Date('2025-06-30'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].totalHoursAllocated).toBeGreaterThan(0);
      expect(result[0].assignedTasks).toBe(1);
    });

    it('returns empty list when no resources exist', async () => {
      const caller = createManagerCaller(db);

      const result = await caller.analytics.resourceUtilization({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2020-12-31'),
      });

      expect(result).toEqual([]);
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.analytics.resourceUtilization({
          dateFrom: new Date('2020-01-01'),
          dateTo: new Date('2020-12-31'),
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });

  // ============================================
  // Task Performance Analytics (FR-027)
  // ============================================

  describe('analytics.taskPerformance', () => {
    it('returns performance stats for all categories', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createTask(db, event.id, { category: 'pre_event', status: 'completed' });
      await createTask(db, event.id, { category: 'during_event', status: 'pending' });
      await createTask(db, event.id, { category: 'post_event', status: 'in_progress' });

      const result = await caller.analytics.taskPerformance({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2030-12-31'),
      });

      expect(result).toHaveLength(3);
      expect(result.some((r) => r.category === 'pre_event')).toBe(true);
      expect(result.some((r) => r.category === 'during_event')).toBe(true);
      expect(result.some((r) => r.category === 'post_event')).toBe(true);
    });

    it('filters by category', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createTask(db, event.id, { category: 'pre_event' });
      await createTask(db, event.id, { category: 'post_event' });

      const result = await caller.analytics.taskPerformance({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2030-12-31'),
        category: 'pre_event',
      });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('pre_event');
      expect(result[0].totalTasks).toBe(1);
    });

    it('counts completed tasks', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createTask(db, event.id, { category: 'pre_event', status: 'completed' });
      await createTask(db, event.id, { category: 'pre_event', status: 'completed' });
      await createTask(db, event.id, { category: 'pre_event', status: 'pending' });

      const result = await caller.analytics.taskPerformance({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2030-12-31'),
        category: 'pre_event',
      });

      expect(result[0].totalTasks).toBe(3);
      expect(result[0].completedTasks).toBe(2);
    });

    it('counts overdue tasks', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      // Create a task with past due date
      await createTask(db, event.id, {
        category: 'pre_event',
        status: 'pending',
        dueDate: new Date('2020-01-01'), // Past due
      });

      const result = await caller.analytics.taskPerformance({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2030-12-31'),
        category: 'pre_event',
      });

      expect(result[0].overdueCount).toBe(1);
    });

    it('returns zero stats when no tasks in range', async () => {
      const caller = createManagerCaller(db);

      const result = await caller.analytics.taskPerformance({
        dateFrom: new Date('2020-01-01'),
        dateTo: new Date('2020-12-31'),
      });

      // Should return all 3 categories but with zero counts
      expect(result).toHaveLength(3);
      expect(result.every((r) => r.totalTasks === 0)).toBe(true);
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.analytics.taskPerformance({
          dateFrom: new Date('2020-01-01'),
          dateTo: new Date('2020-12-31'),
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });
});
