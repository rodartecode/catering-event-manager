import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
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
} from '../helpers/factories';

// Mock the scheduling client
vi.mock('@/server/services/scheduling-client', () => ({
  schedulingClient: {
    checkConflicts: vi.fn(),
    getResourceAvailability: vi.fn(),
    healthCheck: vi.fn(),
  },
  SchedulingClientError: class SchedulingClientError extends Error {
    statusCode?: number;
    code?: string;
    constructor(message: string, statusCode?: number, code?: string) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.name = 'SchedulingClientError';
    }
  },
}));

import { schedulingClient, SchedulingClientError } from '@/server/services/scheduling-client';

const mockCheckConflicts = vi.mocked(schedulingClient.checkConflicts);

function makeConflict(resourceId: number, resourceName: string, message: string) {
  return {
    resource_id: resourceId,
    resource_name: resourceName,
    conflicting_event_id: 999,
    conflicting_event_name: 'Other Event',
    existing_start_time: '2026-03-01T08:00:00Z',
    existing_end_time: '2026-03-01T16:00:00Z',
    requested_start_time: '2026-03-01T09:00:00Z',
    requested_end_time: '2026-03-01T17:00:00Z',
    message,
  };
}

describe('Resource Conflict Scenarios', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
    vi.clearAllMocks();

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

  it('detects conflict for overlapping time range', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);
    const event = await createEvent(db, client.id, 1);
    const task = await createTask(db, event.id, { title: 'Setup' });
    const resource = await createResource(db, { name: 'Head Chef', type: 'staff' });

    // Mock: scheduling service reports a conflict
    mockCheckConflicts.mockResolvedValueOnce({
      has_conflicts: true,
      conflicts: [makeConflict(resource.id, 'Head Chef', 'Overlapping schedule: 9AM-5PM')],
    });

    const startTime = new Date('2026-03-01T09:00:00Z');
    const endTime = new Date('2026-03-01T17:00:00Z');

    const result = await caller.task.assignResources({
      taskId: task.id,
      resourceIds: [resource.id],
      startTime,
      endTime,
      force: false,
    });

    expect(result.success).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts?.[0].resourceId).toBe(resource.id);
  });

  it('allows force override despite conflict', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);
    const event = await createEvent(db, client.id, 1);
    const task = await createTask(db, event.id, { title: 'Priority Setup' });
    const resource = await createResource(db, { name: 'Portable Oven', type: 'equipment' });

    // Mock: scheduling service reports a conflict
    mockCheckConflicts.mockResolvedValueOnce({
      has_conflicts: true,
      conflicts: [makeConflict(resource.id, 'Portable Oven', 'Overlapping schedule')],
    });

    const startTime = new Date('2026-03-01T09:00:00Z');
    const endTime = new Date('2026-03-01T17:00:00Z');

    const result = await caller.task.assignResources({
      taskId: task.id,
      resourceIds: [resource.id],
      startTime,
      endTime,
      force: true,
    });

    expect(result.success).toBe(true);
    expect(result.forceOverride).toBe(true);
    expect(result.assignedResources).toBe(1);
  });

  it('handles multiple resources with mixed conflict/clear results', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);
    const event = await createEvent(db, client.id, 1);
    const task = await createTask(db, event.id, { title: 'Big Setup' });
    const chef = await createResource(db, { name: 'Chef', type: 'staff' });
    const oven = await createResource(db, { name: 'Oven', type: 'equipment' });

    // Mock: chef has conflict, oven is clear
    mockCheckConflicts.mockResolvedValueOnce({
      has_conflicts: true,
      conflicts: [makeConflict(chef.id, 'Chef', 'Already scheduled')],
    });

    const startTime = new Date('2026-03-01T09:00:00Z');
    const endTime = new Date('2026-03-01T17:00:00Z');

    // Without force, returns conflicts
    const result = await caller.task.assignResources({
      taskId: task.id,
      resourceIds: [chef.id, oven.id],
      startTime,
      endTime,
      force: false,
    });

    expect(result.success).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts?.[0].resourceId).toBe(chef.id);
  });

  it('handles Go service unavailability with force=true', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);
    const event = await createEvent(db, client.id, 1);
    const task = await createTask(db, event.id, { title: 'Urgent Setup' });
    const resource = await createResource(db, { name: 'Server', type: 'staff' });

    // Mock: scheduling service is unavailable
    mockCheckConflicts.mockRejectedValueOnce(
      new SchedulingClientError('Connection refused', undefined, 'CONNECTION_ERROR')
    );

    const startTime = new Date('2026-03-01T09:00:00Z');
    const endTime = new Date('2026-03-01T17:00:00Z');

    // With force=true, proceeds despite service unavailability
    const result = await caller.task.assignResources({
      taskId: task.id,
      resourceIds: [resource.id],
      startTime,
      endTime,
      force: true,
    });

    expect(result.success).toBe(true);
    expect(result.warning).toContain('scheduling service unavailable');
    expect(result.assignedResources).toBe(1);
  });
});
