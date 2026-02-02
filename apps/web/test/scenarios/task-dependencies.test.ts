import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../helpers/db';
import { createClient, createEvent, createUser } from '../helpers/factories';
import { createAdminCaller, testUsers } from '../helpers/trpc';

describe('Task Dependency Chain Scenarios', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);

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

  it('enforces 3-level dependency chain execution order (A → B → C)', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);
    const event = await createEvent(db, client.id, 1);

    // Create chain: A (no deps) → B (depends on A) → C (depends on B)
    const taskA = await caller.task.create({
      eventId: event.id,
      title: 'Task A - Foundation',
      category: 'pre_event',
    });

    const taskB = await caller.task.create({
      eventId: event.id,
      title: 'Task B - Depends on A',
      category: 'pre_event',
      dependsOnTaskId: taskA.id,
    });

    const taskC = await caller.task.create({
      eventId: event.id,
      title: 'Task C - Depends on B',
      category: 'during_event',
      dependsOnTaskId: taskB.id,
    });

    // C cannot start because B is not completed
    await expect(
      caller.task.updateStatus({ id: taskC.id, newStatus: 'in_progress' })
    ).rejects.toThrow('dependency');

    // B cannot start because A is not completed
    await expect(
      caller.task.updateStatus({ id: taskB.id, newStatus: 'in_progress' })
    ).rejects.toThrow('dependency');

    // A can start (no deps)
    await caller.task.updateStatus({ id: taskA.id, newStatus: 'in_progress' });
    await caller.task.updateStatus({ id: taskA.id, newStatus: 'completed' });

    // Now B can start
    await caller.task.updateStatus({ id: taskB.id, newStatus: 'in_progress' });
    await caller.task.updateStatus({ id: taskB.id, newStatus: 'completed' });

    // Now C can start
    await caller.task.updateStatus({ id: taskC.id, newStatus: 'in_progress' });
    await caller.task.updateStatus({ id: taskC.id, newStatus: 'completed' });

    // Verify all completed
    const finalA = await caller.task.getById({ id: taskA.id });
    const finalB = await caller.task.getById({ id: taskB.id });
    const finalC = await caller.task.getById({ id: taskC.id });

    expect(finalA.status).toBe('completed');
    expect(finalB.status).toBe('completed');
    expect(finalC.status).toBe('completed');
  });

  it('prevents circular dependencies (A → B, then B → A rejected)', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);
    const event = await createEvent(db, client.id, 1);

    const taskA = await caller.task.create({
      eventId: event.id,
      title: 'Task A',
      category: 'pre_event',
    });

    const taskB = await caller.task.create({
      eventId: event.id,
      title: 'Task B',
      category: 'pre_event',
      dependsOnTaskId: taskA.id,
    });

    // Try to make A depend on B (would create cycle: A → B → A)
    await expect(
      caller.task.update({
        id: taskA.id,
        dependsOnTaskId: taskB.id,
      })
    ).rejects.toThrow('circular dependency');
  });

  it('prevents self-reference (A → A rejected)', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);
    const event = await createEvent(db, client.id, 1);

    const taskA = await caller.task.create({
      eventId: event.id,
      title: 'Task A',
      category: 'pre_event',
    });

    // Try to make A depend on itself
    await expect(
      caller.task.update({
        id: taskA.id,
        dependsOnTaskId: taskA.id,
      })
    ).rejects.toThrow('cannot depend on itself');
  });

  it('clears dependencies when middle task is deleted (A → B → C, delete B)', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);
    const event = await createEvent(db, client.id, 1);

    const taskA = await caller.task.create({
      eventId: event.id,
      title: 'Task A',
      category: 'pre_event',
    });

    const taskB = await caller.task.create({
      eventId: event.id,
      title: 'Task B',
      category: 'pre_event',
      dependsOnTaskId: taskA.id,
    });

    const taskC = await caller.task.create({
      eventId: event.id,
      title: 'Task C',
      category: 'during_event',
      dependsOnTaskId: taskB.id,
    });

    // Delete middle task B
    const deleteResult = await caller.task.delete({ id: taskB.id });
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.clearedDependencies).toBe(1); // C's dependency was cleared

    // C should now have no dependency and be startable
    const updatedC = await caller.task.getById({ id: taskC.id });
    expect(updatedC.dependsOnTaskId).toBeNull();

    // C can now start without any dependency blocking
    await caller.task.updateStatus({ id: taskC.id, newStatus: 'in_progress' });
    const finalC = await caller.task.getById({ id: taskC.id });
    expect(finalC.status).toBe('in_progress');
  });
});
