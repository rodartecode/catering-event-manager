import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../helpers/db';
import { createArchivedEvent, createClient, createEvent, createUser } from '../helpers/factories';
import { createAdminCaller, testUsers } from '../helpers/trpc';

describe('Event Lifecycle Scenarios', () => {
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

  it('traverses full lifecycle: inquiry → planning → preparation → in_progress → completed → follow_up → archive', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);

    // Create event (starts as inquiry)
    const event = await caller.event.create({
      clientId: client.id,
      eventName: 'Full Lifecycle Event',
      eventDate: new Date('2026-06-15'),
    });

    expect(event.status).toBe('inquiry');

    // Progress through each status
    const transitions = [
      'planning',
      'preparation',
      'in_progress',
      'completed',
      'follow_up',
    ] as const;

    for (const newStatus of transitions) {
      const result = await caller.event.updateStatus({
        id: event.id,
        newStatus,
      });
      expect(result.success).toBe(true);
    }

    // Need to go back to completed for archiving (follow_up → completed)
    await caller.event.updateStatus({
      id: event.id,
      newStatus: 'completed',
    });

    // Archive
    const archiveResult = await caller.event.archive({ id: event.id });
    expect(archiveResult.success).toBe(true);

    // Verify final state
    const finalEvent = await caller.event.getById({ id: event.id });
    expect(finalEvent.isArchived).toBe(true);
    expect(finalEvent.archivedAt).toBeDefined();
  });

  it('maintains status log integrity after full traversal', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);

    const event = await caller.event.create({
      clientId: client.id,
      eventName: 'Status Log Event',
      eventDate: new Date('2026-06-15'),
    });

    // Transition through statuses
    await caller.event.updateStatus({ id: event.id, newStatus: 'planning' });
    await caller.event.updateStatus({ id: event.id, newStatus: 'preparation' });
    await caller.event.updateStatus({ id: event.id, newStatus: 'in_progress' });
    await caller.event.updateStatus({ id: event.id, newStatus: 'completed' });

    // Get event with status history
    const result = await caller.event.getById({ id: event.id });

    // Should have 5 entries: initial creation + 4 transitions
    expect(result.statusHistory.length).toBeGreaterThanOrEqual(5);

    // Verify the log contains transitions in order (most recent first due to DESC)
    const history = [...result.statusHistory].reverse(); // Reverse to chronological order
    expect(history[0].newStatus).toBe('inquiry');
    expect(history[1].oldStatus).toBe('inquiry');
    expect(history[1].newStatus).toBe('planning');
    expect(history[2].oldStatus).toBe('planning');
    expect(history[2].newStatus).toBe('preparation');
    expect(history[3].oldStatus).toBe('preparation');
    expect(history[3].newStatus).toBe('in_progress');
    expect(history[4].oldStatus).toBe('in_progress');
    expect(history[4].newStatus).toBe('completed');
  });

  it('rejects archiving non-completed events', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);

    const nonCompletedStatuses = [
      'inquiry',
      'planning',
      'preparation',
      'in_progress',
      'follow_up',
    ] as const;

    for (const status of nonCompletedStatuses) {
      const event = await createEvent(db, client.id, 1, { status });

      await expect(caller.event.archive({ id: event.id })).rejects.toThrow(
        'Only completed events can be archived'
      );
    }
  });

  it('rejects mutations on archived events (frozen invariant)', async () => {
    const caller = createAdminCaller(db);
    const client = await createClient(db);
    const archivedEvent = await createArchivedEvent(db, client.id, 1);

    // updateStatus should be rejected
    await expect(
      caller.event.updateStatus({
        id: archivedEvent.id,
        newStatus: 'planning',
      })
    ).rejects.toThrow('Cannot update status of archived event');

    // update should be rejected
    await expect(
      caller.event.update({
        id: archivedEvent.id,
        eventName: 'New Name',
      })
    ).rejects.toThrow('Cannot update archived event');

    // task.create should be rejected
    await expect(
      caller.task.create({
        eventId: archivedEvent.id,
        title: 'New Task',
        category: 'pre_event',
      })
    ).rejects.toThrow('Cannot add tasks to archived event');
  });
});
