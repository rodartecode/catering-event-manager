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
  createClientCaller,
  testUsers,
} from '../../../test/helpers/trpc';
import {
  createUser,
  createClient,
  createEvent,
  createTask,
  createCommunication,
  createClientWithPortal,
  createPortalTestSetup,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import { sql } from 'drizzle-orm';

// Note: Auth and email mocks are configured globally in test/setup.ts

describe('portal router', () => {
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
      name: testUsers.admin.name ?? 'Test Admin',
      role: testUsers.admin.role,
    });
    await createUser(db, {
      email: testUsers.manager.email,
      name: testUsers.manager.name ?? 'Test Manager',
      role: testUsers.manager.role,
    });
  });

  // ============================================
  // requestMagicLink (public procedure)
  // ============================================

  describe('portal.requestMagicLink', () => {
    it('returns success for any email (prevents enumeration)', async () => {
      const caller = createUnauthenticatedCaller(db);

      const result = await caller.portal.requestMagicLink({
        email: 'nonexistent@example.com',
      });

      expect(result).toEqual({ success: true });
    });

    it('returns success for non-client user', async () => {
      const caller = createUnauthenticatedCaller(db);

      // Use admin email (non-client role)
      const result = await caller.portal.requestMagicLink({
        email: testUsers.admin.email,
      });

      expect(result).toEqual({ success: true });
    });

    it('returns success for client without portal enabled', async () => {
      const caller = createUnauthenticatedCaller(db);

      // Create client without portal enabled
      const client = await createClient(db, { portalEnabled: false });
      await createUser(db, {
        email: client.email,
        role: 'client',
        clientId: client.id,
      });

      const result = await caller.portal.requestMagicLink({
        email: client.email,
      });

      expect(result).toEqual({ success: true });
    });

    it('returns success for valid client with portal enabled', async () => {
      const caller = createUnauthenticatedCaller(db);
      const { portalUser } = await createClientWithPortal(db);

      const result = await caller.portal.requestMagicLink({
        email: portalUser.email,
      });

      expect(result).toEqual({ success: true });
    });

    it('rejects invalid email format', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.portal.requestMagicLink({ email: 'invalid-email' })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // getSummary (clientProcedure)
  // ============================================

  describe('portal.getSummary', () => {
    it('returns client info and active events', async () => {
      const { client, portalUser } = await createPortalTestSetup(db, {
        eventCount: 2,
        taskCount: 0,
      });

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.getSummary();

      expect(result.client).toMatchObject({
        companyName: client.company_name,
        contactName: client.contact_name,
      });
      expect(result.activeEventsCount).toBe(2);
      expect(result.events).toHaveLength(2);
    });

    it('excludes archived events from count', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 1,
        taskCount: 0,
      });

      // Create and archive an event
      const archivedEvent = await createEvent(db, client.id, adminUser.id, {
        eventName: 'Archived Event',
      });
      await db.execute(sql`
        UPDATE events SET is_archived = true WHERE id = ${archivedEvent.id}
      `);

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.getSummary();

      expect(result.activeEventsCount).toBe(1);
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(caller.portal.getSummary()).rejects.toThrow('UNAUTHORIZED');
    });

    it('rejects admin users (client only)', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.portal.getSummary()).rejects.toThrow('Client access required');
    });

    it('rejects manager users (client only)', async () => {
      const caller = createManagerCaller(db);

      await expect(caller.portal.getSummary()).rejects.toThrow('Client access required');
    });
  });

  // ============================================
  // listEvents (clientProcedure)
  // ============================================

  describe('portal.listEvents', () => {
    it('returns only client events', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 2,
        taskCount: 0,
      });

      // Create another client with events
      const otherClient = await createClient(db);
      await createEvent(db, otherClient.id, adminUser.id);

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.listEvents();

      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('supports filtering by status', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      await createEvent(db, client.id, adminUser.id, { status: 'inquiry' });
      await createEvent(db, client.id, adminUser.id, { status: 'planning' });
      await createEvent(db, client.id, adminUser.id, { status: 'completed' });

      const caller = createClientCaller(db, client.id, String(portalUser.id));

      const inquiryEvents = await caller.portal.listEvents({ status: 'inquiry' });
      expect(inquiryEvents.events).toHaveLength(1);
      expect(inquiryEvents.events[0].status).toBe('inquiry');

      const planningEvents = await caller.portal.listEvents({ status: 'planning' });
      expect(planningEvents.events).toHaveLength(1);
    });

    it('supports pagination', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      // Create 5 events
      for (let i = 0; i < 5; i++) {
        await createEvent(db, client.id, adminUser.id);
      }

      const caller = createClientCaller(db, client.id, String(portalUser.id));

      const page1 = await caller.portal.listEvents({ limit: 2, offset: 0 });
      expect(page1.events).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = await caller.portal.listEvents({ limit: 2, offset: 2 });
      expect(page2.events).toHaveLength(2);

      const page3 = await caller.portal.listEvents({ limit: 2, offset: 4 });
      expect(page3.events).toHaveLength(1);
    });

    it('excludes archived events by default', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const activeEvent = await createEvent(db, client.id, adminUser.id);
      const archivedEvent = await createEvent(db, client.id, adminUser.id);
      await db.execute(sql`
        UPDATE events SET is_archived = true WHERE id = ${archivedEvent.id}
      `);

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.listEvents();

      expect(result.events).toHaveLength(1);
      expect(result.events[0].id).toBe(activeEvent.id);
    });

    it('can include archived events when requested', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      await createEvent(db, client.id, adminUser.id);
      const archivedEvent = await createEvent(db, client.id, adminUser.id);
      await db.execute(sql`
        UPDATE events SET is_archived = true WHERE id = ${archivedEvent.id}
      `);

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.listEvents({ includeArchived: true });

      expect(result.events).toHaveLength(2);
    });
  });

  // ============================================
  // getEvent (clientProcedure)
  // ============================================

  describe('portal.getEvent', () => {
    it('returns event details with task progress', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const event = await createEvent(db, client.id, adminUser.id, {
        eventName: 'Birthday Party',
        location: 'Grand Ballroom',
        status: 'planning',
      });

      // Create tasks with different statuses
      await createTask(db, event.id, { status: 'completed' });
      await createTask(db, event.id, { status: 'completed' });
      await createTask(db, event.id, { status: 'pending' });

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.getEvent({ eventId: event.id });

      expect(result).toMatchObject({
        eventName: 'Birthday Party',
        location: 'Grand Ballroom',
        status: 'planning',
      });
      expect(result.taskProgress).toEqual({
        total: 3,
        completed: 2,
      });
    });

    it('rejects access to other client events', async () => {
      const { portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      // Create another client with an event
      const otherClient = await createClient(db);
      const otherEvent = await createEvent(db, otherClient.id, adminUser.id);

      // Try to access other client's event - use portalUser's client ID
      const { client } = await createClientWithPortal(db);
      const caller = createClientCaller(db, client.id, String(portalUser.id));

      await expect(
        caller.portal.getEvent({ eventId: otherEvent.id })
      ).rejects.toThrow('Event not found');
    });

    it('returns 404 for non-existent event', async () => {
      const { client, portalUser } = await createPortalTestSetup(db);

      const caller = createClientCaller(db, client.id, String(portalUser.id));

      await expect(
        caller.portal.getEvent({ eventId: 99999 })
      ).rejects.toThrow('Event not found');
    });

    it('returns 404 for archived event', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const event = await createEvent(db, client.id, adminUser.id);
      await db.execute(sql`
        UPDATE events SET is_archived = true WHERE id = ${event.id}
      `);

      const caller = createClientCaller(db, client.id, String(portalUser.id));

      await expect(
        caller.portal.getEvent({ eventId: event.id })
      ).rejects.toThrow('Event not found');
    });
  });

  // ============================================
  // getEventTimeline (clientProcedure)
  // ============================================

  describe('portal.getEventTimeline', () => {
    it('returns status history', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const event = await createEvent(db, client.id, adminUser.id, {
        status: 'inquiry',
      });

      // Add status log entries
      await db.execute(sql`
        INSERT INTO event_status_log (event_id, old_status, new_status, changed_by, notes)
        VALUES
          (${event.id}, 'inquiry', 'planning', ${adminUser.id}, 'Internal note'),
          (${event.id}, 'planning', 'preparation', ${adminUser.id}, 'Another note')
      `);

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.getEventTimeline({ eventId: event.id });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        oldStatus: 'inquiry',
        newStatus: 'planning',
      });
      // Notes should NOT be returned (privacy)
      expect(result[0]).not.toHaveProperty('notes');
    });

    it('rejects access to other client timeline', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const otherClient = await createClient(db);
      const otherEvent = await createEvent(db, otherClient.id, adminUser.id);

      const caller = createClientCaller(db, client.id, String(portalUser.id));

      await expect(
        caller.portal.getEventTimeline({ eventId: otherEvent.id })
      ).rejects.toThrow('Event not found');
    });
  });

  // ============================================
  // getEventTasks (clientProcedure)
  // ============================================

  describe('portal.getEventTasks', () => {
    it('returns tasks for event', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const event = await createEvent(db, client.id, adminUser.id);
      await createTask(db, event.id, {
        title: 'Setup tables',
        category: 'pre_event',
        status: 'pending',
      });
      await createTask(db, event.id, {
        title: 'Serve food',
        category: 'during_event',
        status: 'completed',
      });

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.getEventTasks({ eventId: event.id });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        title: 'Setup tables',
        category: 'pre_event',
        status: 'pending',
      });
      // Should not expose internal details like assignedTo
      expect(result[0]).not.toHaveProperty('assignedTo');
    });

    it('includes overdue indicator', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const event = await createEvent(db, client.id, adminUser.id);
      const pastDate = new Date('2020-01-01');
      await createTask(db, event.id, {
        title: 'Overdue task',
        status: 'pending',
        dueDate: pastDate,
      });
      await createTask(db, event.id, {
        title: 'Completed task',
        status: 'completed',
        dueDate: pastDate,
      });

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.getEventTasks({ eventId: event.id });

      const overdueTask = result.find((t) => t.title === 'Overdue task');
      const completedTask = result.find((t) => t.title === 'Completed task');

      expect(overdueTask?.isOverdue).toBe(true);
      expect(completedTask?.isOverdue).toBe(false); // Completed tasks aren't overdue
    });

    it('rejects access to other client tasks', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const otherClient = await createClient(db);
      const otherEvent = await createEvent(db, otherClient.id, adminUser.id);

      const caller = createClientCaller(db, client.id, String(portalUser.id));

      await expect(
        caller.portal.getEventTasks({ eventId: otherEvent.id })
      ).rejects.toThrow('Event not found');
    });
  });

  // ============================================
  // getEventCommunications (clientProcedure)
  // ============================================

  describe('portal.getEventCommunications', () => {
    it('returns communications for event', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const event = await createEvent(db, client.id, adminUser.id);
      await createCommunication(db, event.id, client.id, {
        type: 'email',
        subject: 'Event Confirmation',
        notes: 'Internal staff notes here',
      });
      await createCommunication(db, event.id, client.id, {
        type: 'phone',
        subject: 'Follow-up call',
      });

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.getEventCommunications({ eventId: event.id });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        type: expect.stringMatching(/email|phone/),
      });
      // Notes should NOT be returned (privacy)
      expect(result[0]).not.toHaveProperty('notes');
    });

    it('rejects access to other client communications', async () => {
      const { client, portalUser, adminUser } = await createPortalTestSetup(db, {
        eventCount: 0,
        taskCount: 0,
      });

      const otherClient = await createClient(db);
      const otherEvent = await createEvent(db, otherClient.id, adminUser.id);

      const caller = createClientCaller(db, client.id, String(portalUser.id));

      await expect(
        caller.portal.getEventCommunications({ eventId: otherEvent.id })
      ).rejects.toThrow('Event not found');
    });
  });

  // ============================================
  // getProfile (clientProcedure)
  // ============================================

  describe('portal.getProfile', () => {
    it('returns client profile', async () => {
      const { client, portalUser } = await createClientWithPortal(db, {
        companyName: 'Acme Corp',
        contactName: 'John Doe',
        email: 'john@acme.com',
      });

      const caller = createClientCaller(db, client.id, String(portalUser.id));
      const result = await caller.portal.getProfile();

      expect(result).toMatchObject({
        companyName: 'Acme Corp',
        contactName: 'John Doe',
        email: 'john@acme.com',
      });
      // Should not expose internal notes
      expect(result).not.toHaveProperty('notes');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(caller.portal.getProfile()).rejects.toThrow('UNAUTHORIZED');
    });
  });

  // ============================================
  // Data Isolation Tests (Security)
  // ============================================

  describe('data isolation', () => {
    it('client A cannot see client B events', async () => {
      // Create two clients with portal access
      const { client: clientA, portalUser: userA } = await createClientWithPortal(db);
      const { client: clientB } = await createClientWithPortal(db);

      // Create events for both
      const adminUser = await createUser(db, { role: 'administrator' });
      await createEvent(db, clientA.id, adminUser.id, { eventName: 'Client A Event' });
      await createEvent(db, clientB.id, adminUser.id, { eventName: 'Client B Event' });

      const callerA = createClientCaller(db, clientA.id, String(userA.id));
      const events = await callerA.portal.listEvents();

      expect(events.events).toHaveLength(1);
      expect(events.events[0].eventName).toBe('Client A Event');
    });

    it('client cannot access event by guessing ID', async () => {
      const { client, portalUser } = await createClientWithPortal(db);
      const otherClient = await createClient(db);
      const adminUser = await createUser(db, { role: 'administrator' });

      const otherEvent = await createEvent(db, otherClient.id, adminUser.id);

      const caller = createClientCaller(db, client.id, String(portalUser.id));

      // Try to access by direct ID
      await expect(
        caller.portal.getEvent({ eventId: otherEvent.id })
      ).rejects.toThrow('Event not found');

      await expect(
        caller.portal.getEventTasks({ eventId: otherEvent.id })
      ).rejects.toThrow('Event not found');

      await expect(
        caller.portal.getEventTimeline({ eventId: otherEvent.id })
      ).rejects.toThrow('Event not found');

      await expect(
        caller.portal.getEventCommunications({ eventId: otherEvent.id })
      ).rejects.toThrow('Event not found');
    });
  });
});
