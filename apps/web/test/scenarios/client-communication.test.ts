import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
  type TestDatabase,
} from '../helpers/db';
import {
  createAdminCaller,
  createManagerCaller,
  testUsers,
} from '../helpers/trpc';
import {
  createUser,
  createClient,
  createEvent,
} from '../helpers/factories';

describe('Client Communication Workflow Scenarios', () => {
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

  it('completes full follow-up workflow: record → schedule → verify not due → set past → overdue → complete → resolved', async () => {
    const adminCaller = createAdminCaller(db);
    const managerCaller = createManagerCaller(db);
    const client = await createClient(db, { companyName: 'Workflow Corp' });
    const event = await createEvent(db, client.id, 1, { eventName: 'Workflow Event' });

    // Step 1: Record a communication
    const communication = await adminCaller.clients.recordCommunication({
      eventId: event.id,
      clientId: client.id,
      type: 'phone',
      subject: 'Initial discussion',
      notes: 'Discussed event requirements',
    });

    expect(communication.id).toBeDefined();
    expect(communication.followUpCompleted).toBe(false);

    // Step 2: Schedule a future follow-up
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

    await adminCaller.clients.scheduleFollowUp({
      communicationId: communication.id,
      followUpDate: futureDate,
    });

    // Step 3: Verify it's NOT due yet (future date)
    const notYetDue = await managerCaller.clients.getDueFollowUps();
    const futureItem = notYetDue.followUps.find(
      (f) => f.communication.id === communication.id
    );
    expect(futureItem).toBeUndefined(); // Not due yet

    // Step 4: Reschedule to a past date (simulate time passing)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

    await adminCaller.clients.scheduleFollowUp({
      communicationId: communication.id,
      followUpDate: pastDate,
    });

    // Step 5: Verify it IS now overdue
    const overdueResult = await managerCaller.clients.getDueFollowUps();
    const overdueItem = overdueResult.followUps.find(
      (f) => f.communication.id === communication.id
    );
    expect(overdueItem).toBeDefined();
    expect(overdueItem?.daysOverdue).toBeGreaterThanOrEqual(4);
    expect(overdueItem?.daysOverdue).toBeLessThanOrEqual(6);

    // Step 6: Complete the follow-up
    const completed = await managerCaller.clients.completeFollowUp({
      communicationId: communication.id,
    });
    expect(completed.followUpCompleted).toBe(true);

    // Step 7: Verify it's no longer in due follow-ups
    const afterComplete = await managerCaller.clients.getDueFollowUps();
    const resolvedItem = afterComplete.followUps.find(
      (f) => f.communication.id === communication.id
    );
    expect(resolvedItem).toBeUndefined(); // Resolved
  });

  it('calculates daysOverdue accurately across known date ranges', async () => {
    const adminCaller = createAdminCaller(db);
    const managerCaller = createManagerCaller(db);
    const client = await createClient(db);
    const event = await createEvent(db, client.id, 1);

    // Record a communication with follow-up exactly 20 days ago
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    twentyDaysAgo.setHours(0, 0, 0, 0);

    const communication = await adminCaller.clients.recordCommunication({
      eventId: event.id,
      clientId: client.id,
      type: 'email',
      followUpDate: twentyDaysAgo,
    });

    const result = await managerCaller.clients.getDueFollowUps();

    const item = result.followUps.find(
      (f) => f.communication.id === communication.id
    );
    expect(item).toBeDefined();
    // Allow ±1 day tolerance for timezone/midnight edge cases
    expect(item?.daysOverdue).toBeGreaterThanOrEqual(19);
    expect(item?.daysOverdue).toBeLessThanOrEqual(21);
  });

  it('handles multiple follow-ups with incremental completion', async () => {
    const adminCaller = createAdminCaller(db);
    const managerCaller = createManagerCaller(db);
    const client = await createClient(db, { companyName: 'Multi Follow-Up Corp' });
    const event = await createEvent(db, client.id, 1);

    // Create 3 communications with overdue follow-ups
    const comm1 = await adminCaller.clients.recordCommunication({
      eventId: event.id,
      clientId: client.id,
      type: 'email',
      subject: 'First contact',
      followUpDate: new Date('2025-06-01'),
    });

    const comm2 = await adminCaller.clients.recordCommunication({
      eventId: event.id,
      clientId: client.id,
      type: 'phone',
      subject: 'Second contact',
      followUpDate: new Date('2025-09-01'),
    });

    const comm3 = await adminCaller.clients.recordCommunication({
      eventId: event.id,
      clientId: client.id,
      type: 'meeting',
      subject: 'Third contact',
      followUpDate: new Date('2025-12-01'),
    });

    // All 3 should be due
    const initial = await managerCaller.clients.getDueFollowUps();
    expect(initial.count).toBe(3);

    // Complete first follow-up
    await managerCaller.clients.completeFollowUp({ communicationId: comm1.id });

    const afterFirst = await managerCaller.clients.getDueFollowUps();
    expect(afterFirst.count).toBe(2);

    // Complete second follow-up
    await managerCaller.clients.completeFollowUp({ communicationId: comm2.id });

    const afterSecond = await managerCaller.clients.getDueFollowUps();
    expect(afterSecond.count).toBe(1);

    // Complete third follow-up
    await managerCaller.clients.completeFollowUp({ communicationId: comm3.id });

    const afterThird = await managerCaller.clients.getDueFollowUps();
    expect(afterThird.count).toBe(0);
  });
});
