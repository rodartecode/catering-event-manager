import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../../test/helpers/db';
import {
  createArchivedEvent,
  createClient,
  createEvent,
  createResource,
  createTask,
  createUser,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

// Mock the scheduling client for resource assignment tests
vi.mock('../services/scheduling-client', () => ({
  schedulingClient: {
    checkConflicts: vi.fn().mockResolvedValue({
      has_conflicts: false,
      conflicts: [],
    }),
    getResourceAvailability: vi.fn().mockResolvedValue({
      resource_id: 1,
      entries: [],
    }),
    healthCheck: vi.fn().mockResolvedValue(true),
  },
  SchedulingClientError: class SchedulingClientError extends Error {
    constructor(
      message: string,
      public statusCode?: number,
      public code?: string
    ) {
      super(message);
      this.name = 'SchedulingClientError';
    }
  },
}));

describe('task router', () => {
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
    vi.clearAllMocks();

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

  describe('task.create', () => {
    it('creates a task when called by admin', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.task.create({
        eventId: event.id,
        title: 'Set up tables',
        category: 'pre_event',
        description: 'Arrange all tables for 150 guests',
      });

      expect(result).toMatchObject({
        title: 'Set up tables',
        category: 'pre_event',
        status: 'pending',
      });
      expect(result.id).toBeDefined();
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await expect(
        caller.task.create({
          eventId: event.id,
          title: 'Test Task',
          category: 'pre_event',
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await expect(
        caller.task.create({
          eventId: event.id,
          title: 'Test Task',
          category: 'pre_event',
        })
      ).rejects.toThrow('FORBIDDEN');
    });

    it('rejects task creation for non-existent event', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.task.create({
          eventId: 9999,
          title: 'Test Task',
          category: 'pre_event',
        })
      ).rejects.toThrow('Event not found');
    });

    it('rejects task creation for archived event', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1, { status: 'completed' });

      // Archive the event
      await caller.event.archive({ id: event.id });

      await expect(
        caller.task.create({
          eventId: event.id,
          title: 'Test Task',
          category: 'pre_event',
        })
      ).rejects.toThrow('Cannot add tasks to archived event');
    });

    it('creates task with dependency', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const dependencyTask = await createTask(db, event.id, { title: 'Prerequisite' });

      const result = await caller.task.create({
        eventId: event.id,
        title: 'Dependent Task',
        category: 'pre_event',
        dependsOnTaskId: dependencyTask.id,
      });

      expect(result.dependsOnTaskId).toBe(dependencyTask.id);
    });

    it('rejects dependency from different event', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event1 = await createEvent(db, client.id, 1, { eventName: 'Event 1' });
      const event2 = await createEvent(db, client.id, 1, { eventName: 'Event 2' });
      const task1 = await createTask(db, event1.id);

      await expect(
        caller.task.create({
          eventId: event2.id,
          title: 'Task in Event 2',
          category: 'pre_event',
          dependsOnTaskId: task1.id,
        })
      ).rejects.toThrow('Dependent task must belong to the same event');
    });
  });

  describe('task.assign', () => {
    it('assigns a user to a task', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      const result = await caller.task.assign({
        taskId: task.id,
        userId: 2, // manager user
      });

      expect(result.assignedTo).toBe(2);
    });

    it('unassigns user when userId is null', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      // First assign
      await caller.task.assign({ taskId: task.id, userId: 2 });

      // Then unassign
      const result = await caller.task.assign({ taskId: task.id, userId: null });
      expect(result.assignedTo).toBeNull();
    });

    it('rejects assignment to non-existent user', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      await expect(caller.task.assign({ taskId: task.id, userId: 9999 })).rejects.toThrow(
        'User not found'
      );
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      await expect(caller.task.assign({ taskId: task.id, userId: 2 })).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('task.updateStatus', () => {
    it('allows admin to update any task status', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      const result = await caller.task.updateStatus({
        id: task.id,
        newStatus: 'in_progress',
      });

      expect(result.status).toBe('in_progress');
    });

    it('allows assigned user to update their task status', async () => {
      const adminCaller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      // Assign task to manager (id=2)
      await adminCaller.task.assign({ taskId: task.id, userId: 2 });

      // Manager updates their assigned task
      const managerCaller = createManagerCaller(db);
      const result = await managerCaller.task.updateStatus({
        id: task.id,
        newStatus: 'in_progress',
      });

      expect(result.status).toBe('in_progress');
    });

    it('rejects non-assigned user updating task', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      // Task not assigned to anyone - manager tries to update
      const managerCaller = createManagerCaller(db);
      await expect(
        managerCaller.task.updateStatus({ id: task.id, newStatus: 'in_progress' })
      ).rejects.toThrow('You can only update status of tasks assigned to you');
    });

    it('sets completedAt when marking as completed', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      const result = await caller.task.updateStatus({
        id: task.id,
        newStatus: 'completed',
      });

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
    });

    it('blocks progress if dependency not completed', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const dependencyTask = await createTask(db, event.id, {
        title: 'Prerequisite',
        status: 'pending',
      });
      const task = await caller.task.create({
        eventId: event.id,
        title: 'Dependent Task',
        category: 'pre_event',
        dependsOnTaskId: dependencyTask.id,
      });

      await expect(
        caller.task.updateStatus({ id: task.id, newStatus: 'in_progress' })
      ).rejects.toThrow('Cannot progress task: dependency "Prerequisite" is not completed yet');
    });
  });

  describe('task.listByEvent', () => {
    it('returns empty list when no tasks exist', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.task.listByEvent({ eventId: event.id });

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it('returns tasks for event', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      await createTask(db, event.id, { title: 'Task 1' });
      await createTask(db, event.id, { title: 'Task 2' });

      const result = await caller.task.listByEvent({ eventId: event.id });

      expect(result.items).toHaveLength(2);
    });

    it('filters by status', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      await createTask(db, event.id, { status: 'pending' });
      await createTask(db, event.id, { status: 'completed' });

      const result = await caller.task.listByEvent({
        eventId: event.id,
        status: 'pending',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('pending');
    });

    it('filters by category', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      await createTask(db, event.id, { category: 'pre_event' });
      await createTask(db, event.id, { category: 'post_event' });

      const result = await caller.task.listByEvent({
        eventId: event.id,
        category: 'pre_event',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe('pre_event');
    });
  });

  describe('task.getById', () => {
    it('returns task with details', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id, { title: 'Test Task' });

      const result = await caller.task.getById({ id: task.id });

      expect(result.title).toBe('Test Task');
      expect(result.dependency).toBeNull();
      expect(result.dependentTasks).toEqual([]);
    });

    it('includes dependency information', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const prerequisite = await createTask(db, event.id, { title: 'Prerequisite' });
      const task = await caller.task.create({
        eventId: event.id,
        title: 'Dependent Task',
        category: 'pre_event',
        dependsOnTaskId: prerequisite.id,
      });

      const managerCaller = createManagerCaller(db);
      const result = await managerCaller.task.getById({ id: task.id });

      expect(result.dependency).not.toBeNull();
      expect(result.dependency?.title).toBe('Prerequisite');
    });

    it('throws error for non-existent task', async () => {
      const caller = createManagerCaller(db);

      await expect(caller.task.getById({ id: 9999 })).rejects.toThrow('Task not found');
    });
  });

  describe('task.update', () => {
    it('updates task details', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id, { title: 'Original Title' });

      const result = await caller.task.update({
        id: task.id,
        title: 'Updated Title',
        description: 'New description',
      });

      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('New description');
    });

    it('prevents circular dependency', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task1 = await createTask(db, event.id, { title: 'Task 1' });
      const task2 = await caller.task.create({
        eventId: event.id,
        title: 'Task 2',
        category: 'pre_event',
        dependsOnTaskId: task1.id,
      });

      // Try to make task1 depend on task2 (circular)
      await expect(
        caller.task.update({
          id: task1.id,
          dependsOnTaskId: task2.id,
        })
      ).rejects.toThrow('Cannot create circular dependency');
    });

    it('prevents task depending on itself', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      await expect(
        caller.task.update({
          id: task.id,
          dependsOnTaskId: task.id,
        })
      ).rejects.toThrow('Task cannot depend on itself');
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      await expect(caller.task.update({ id: task.id, title: 'New Title' })).rejects.toThrow(
        'FORBIDDEN'
      );
    });
  });

  describe('task.delete', () => {
    it('deletes a task', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      const result = await caller.task.delete({ id: task.id });

      expect(result.success).toBe(true);

      // Verify task is deleted
      await expect(caller.task.getById({ id: task.id })).rejects.toThrow('Task not found');
    });

    it('clears dependencies when deleting task with dependents', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task1 = await createTask(db, event.id, { title: 'Task 1' });
      const task2 = await caller.task.create({
        eventId: event.id,
        title: 'Task 2 depends on Task 1',
        category: 'pre_event',
        dependsOnTaskId: task1.id,
      });

      const result = await caller.task.delete({ id: task1.id });

      expect(result.clearedDependencies).toBe(1);

      // Verify task2's dependency is cleared
      const updatedTask2 = await caller.task.getById({ id: task2.id });
      expect(updatedTask2.dependsOnTaskId).toBeNull();
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      await expect(caller.task.delete({ id: task.id })).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('task.getAssignableUsers', () => {
    it('returns active users', async () => {
      const caller = createManagerCaller(db);

      const result = await caller.task.getAssignableUsers();

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some((u) => u.email === testUsers.admin.email)).toBe(true);
      expect(result.some((u) => u.email === testUsers.manager.email)).toBe(true);
    });
  });

  describe('task.getAvailableDependencies', () => {
    it('returns tasks from same event', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      await createTask(db, event.id, { title: 'Available Task' });

      const result = await caller.task.getAvailableDependencies({ eventId: event.id });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Available Task');
    });

    it('excludes specified task', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task1 = await createTask(db, event.id, { title: 'Task 1' });
      await createTask(db, event.id, { title: 'Task 2' });

      const result = await caller.task.getAvailableDependencies({
        eventId: event.id,
        excludeTaskId: task1.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Task 2');
    });
  });

  describe('task.assignResources', () => {
    it('assigns resources to a task', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);
      const resource = await createResource(db, { name: 'Server Staff' });

      const result = await caller.task.assignResources({
        taskId: task.id,
        resourceIds: [resource.id],
        startTime: new Date('2026-06-15T09:00:00Z'),
        endTime: new Date('2026-06-15T17:00:00Z'),
      });

      expect(result.success).toBe(true);
      expect(result.assignedResources).toBe(1);
    });

    it('validates end time is after start time', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);
      const resource = await createResource(db);

      await expect(
        caller.task.assignResources({
          taskId: task.id,
          resourceIds: [resource.id],
          startTime: new Date('2026-06-15T17:00:00Z'),
          endTime: new Date('2026-06-15T09:00:00Z'),
        })
      ).rejects.toThrow('End time must be after start time');
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);
      const resource = await createResource(db);

      await expect(
        caller.task.assignResources({
          taskId: task.id,
          resourceIds: [resource.id],
          startTime: new Date('2026-06-15T09:00:00Z'),
          endTime: new Date('2026-06-15T17:00:00Z'),
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('task.getAssignedResources', () => {
    it('returns resources assigned to task', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);
      const resource = await createResource(db, { name: 'Server Staff' });

      // Assign resource
      await caller.task.assignResources({
        taskId: task.id,
        resourceIds: [resource.id],
        startTime: new Date('2026-06-15T09:00:00Z'),
        endTime: new Date('2026-06-15T17:00:00Z'),
      });

      const managerCaller = createManagerCaller(db);
      const result = await managerCaller.task.getAssignedResources({ taskId: task.id });

      expect(result).toHaveLength(1);
      expect(result[0].resource.name).toBe('Server Staff');
    });
  });

  describe('task.markOverdueTasks', () => {
    it('marks overdue tasks', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      // Create task with past due date
      await createTask(db, event.id, {
        title: 'Overdue Task',
        dueDate: new Date('2020-01-01'),
      });

      // markOverdueTasks marks tasks as overdue based on dueDate
      const result = await caller.task.markOverdueTasks();

      expect(result.markedCount).toBeDefined();
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);

      await expect(caller.task.markOverdueTasks()).rejects.toThrow('FORBIDDEN');
    });
  });

  // ============================================
  // Deepened Tests: Multi-level Dependencies
  // ============================================

  describe('task.updateStatus - dependency chain', () => {
    it('enforces 3-level dependency chain execution order (A→B→C)', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const taskA = await createTask(db, event.id, { title: 'Task A' });
      const taskB = await caller.task.create({
        eventId: event.id,
        title: 'Task B',
        category: 'pre_event',
        dependsOnTaskId: taskA.id,
      });
      const taskC = await caller.task.create({
        eventId: event.id,
        title: 'Task C',
        category: 'pre_event',
        dependsOnTaskId: taskB.id,
      });

      // C cannot progress - B not done
      await expect(
        caller.task.updateStatus({ id: taskC.id, newStatus: 'in_progress' })
      ).rejects.toThrow('dependency "Task B" is not completed yet');

      // B cannot progress - A not done
      await expect(
        caller.task.updateStatus({ id: taskB.id, newStatus: 'in_progress' })
      ).rejects.toThrow('dependency "Task A" is not completed yet');

      // Complete A
      await caller.task.updateStatus({ id: taskA.id, newStatus: 'completed' });

      // B can now progress
      const bResult = await caller.task.updateStatus({ id: taskB.id, newStatus: 'in_progress' });
      expect(bResult.status).toBe('in_progress');

      // C still blocked - B not completed
      await expect(
        caller.task.updateStatus({ id: taskC.id, newStatus: 'in_progress' })
      ).rejects.toThrow('dependency "Task B" is not completed yet');

      // Complete B
      await caller.task.updateStatus({ id: taskB.id, newStatus: 'completed' });

      // C can now progress
      const cResult = await caller.task.updateStatus({ id: taskC.id, newStatus: 'in_progress' });
      expect(cResult.status).toBe('in_progress');
    });

    it('clears completedAt when reverting completed to in_progress', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      // Complete the task
      const completed = await caller.task.updateStatus({ id: task.id, newStatus: 'completed' });
      expect(completed.completedAt).toBeDefined();

      // Revert to in_progress
      const reverted = await caller.task.updateStatus({ id: task.id, newStatus: 'in_progress' });
      expect(reverted.status).toBe('in_progress');
      expect(reverted.completedAt).toBeNull();
    });

    it('clears completedAt when reverting completed to pending', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);

      await caller.task.updateStatus({ id: task.id, newStatus: 'completed' });
      const reverted = await caller.task.updateStatus({ id: task.id, newStatus: 'pending' });

      expect(reverted.status).toBe('pending');
      expect(reverted.completedAt).toBeNull();
    });
  });

  // ============================================
  // Deepened Tests: Archived Event Constraints
  // ============================================

  describe('task.update - archived event constraints', () => {
    it('rejects updating tasks in archived events', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const archived = await createArchivedEvent(db, client.id, 1);
      const task = await createTask(db, archived.id);

      await expect(caller.task.update({ id: task.id, title: 'New Title' })).rejects.toThrow();
    });
  });

  // ============================================
  // Deepened Tests: assignResources Edge Cases
  // ============================================

  describe('task.assignResources - edge cases', () => {
    it('assigns multiple resources at once', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);
      const resource1 = await createResource(db, { name: 'Chef' });
      const resource2 = await createResource(db, { name: 'Waiter' });
      const resource3 = await createResource(db, { name: 'Bartender' });

      const result = await caller.task.assignResources({
        taskId: task.id,
        resourceIds: [resource1.id, resource2.id, resource3.id],
        startTime: new Date('2026-06-15T09:00:00Z'),
        endTime: new Date('2026-06-15T17:00:00Z'),
      });

      expect(result.success).toBe(true);
      expect(result.assignedResources).toBe(3);
    });

    it('rejects unavailable resources', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);
      const resource = await createResource(db, {
        name: 'Unavailable Staff',
        isAvailable: false,
      });

      await expect(
        caller.task.assignResources({
          taskId: task.id,
          resourceIds: [resource.id],
          startTime: new Date('2026-06-15T09:00:00Z'),
          endTime: new Date('2026-06-15T17:00:00Z'),
        })
      ).rejects.toThrow();
    });

    it('succeeds with force=true despite conflicts', async () => {
      const { schedulingClient } = await import('../services/scheduling-client');
      vi.mocked(schedulingClient.checkConflicts).mockResolvedValueOnce({
        has_conflicts: true,
        conflicts: [
          {
            resource_id: 1,
            resource_name: 'Chef',
            conflicting_event_id: 99,
            conflicting_event_name: 'Other Event',
            existing_start_time: '2026-06-15T09:00:00Z',
            existing_end_time: '2026-06-15T17:00:00Z',
            requested_start_time: '2026-06-15T13:00:00Z',
            requested_end_time: '2026-06-15T21:00:00Z',
          },
        ],
      } as never);

      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createTask(db, event.id);
      const resource = await createResource(db, { name: 'Chef' });

      const result = await caller.task.assignResources({
        taskId: task.id,
        resourceIds: [resource.id],
        startTime: new Date('2026-06-15T13:00:00Z'),
        endTime: new Date('2026-06-15T21:00:00Z'),
        force: true,
      });

      expect(result.success).toBe(true);
      expect(result.forceOverride).toBe(true);
    });

    it('rejects when archived event task', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const archived = await createArchivedEvent(db, client.id, 1);
      const task = await createTask(db, archived.id);
      const resource = await createResource(db);

      await expect(
        caller.task.assignResources({
          taskId: task.id,
          resourceIds: [resource.id],
          startTime: new Date('2026-06-15T09:00:00Z'),
          endTime: new Date('2026-06-15T17:00:00Z'),
        })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // Deepened Tests: Pagination Filters
  // ============================================

  describe('task.listByEvent - additional filters', () => {
    it('filters overdueOnly tasks', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createTask(db, event.id, {
        title: 'Normal Task',
        dueDate: new Date('2028-01-01'),
      });
      await createTask(db, event.id, {
        title: 'Overdue Task',
        dueDate: new Date('2020-01-01'),
      });

      // Mark overdue tasks first
      await caller.task.markOverdueTasks();

      const managerCaller = createManagerCaller(db);
      const result = await managerCaller.task.listByEvent({
        eventId: event.id,
        overdueOnly: true,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Overdue Task');
    });

    it('supports cursor pagination', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createTask(db, event.id, { title: 'Task 1' });
      await createTask(db, event.id, { title: 'Task 2' });
      await createTask(db, event.id, { title: 'Task 3' });

      const page1 = await caller.task.listByEvent({
        eventId: event.id,
        limit: 2,
      });

      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await caller.task.listByEvent({
        eventId: event.id,
        limit: 2,
        cursor: page1.nextCursor as number,
      });

      expect(page2.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('task.listByEvent - search query', () => {
    it('filters tasks by title query', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      await createTask(db, event.id, { title: 'Setup Decorations' });
      await createTask(db, event.id, { title: 'Order Flowers' });

      const result = await caller.task.listByEvent({ eventId: event.id, query: 'decor' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Setup Decorations');
    });

    it('combines query with status filter', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      await createTask(db, event.id, { title: 'Setup Tables', status: 'pending' });
      await createTask(db, event.id, { title: 'Setup Chairs', status: 'completed' });

      const result = await caller.task.listByEvent({
        eventId: event.id,
        query: 'setup',
        status: 'pending',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Setup Tables');
    });
  });

  // ============================================
  // Deepened Tests: Delete with Cascade
  // ============================================

  describe('task.delete - cascade behavior', () => {
    it('clears 3-level chain when middle task deleted', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const taskA = await createTask(db, event.id, { title: 'Task A' });
      const taskB = await caller.task.create({
        eventId: event.id,
        title: 'Task B',
        category: 'pre_event',
        dependsOnTaskId: taskA.id,
      });
      const taskC = await caller.task.create({
        eventId: event.id,
        title: 'Task C',
        category: 'pre_event',
        dependsOnTaskId: taskB.id,
      });

      // Delete middle task B
      const result = await caller.task.delete({ id: taskB.id });
      expect(result.clearedDependencies).toBe(1);

      // C's dependency should be cleared
      const updatedC = await caller.task.getById({ id: taskC.id });
      expect(updatedC.dependsOnTaskId).toBeNull();

      // C can now progress freely
      const cResult = await caller.task.updateStatus({ id: taskC.id, newStatus: 'in_progress' });
      expect(cResult.status).toBe('in_progress');
    });
  });
});
