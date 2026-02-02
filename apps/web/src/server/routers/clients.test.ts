import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../../test/helpers/db';
import {
  createClient,
  createCommunication,
  createEvent,
  createUser,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('clients router', () => {
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
  // Client CRUD Operations
  // ============================================

  describe('clients.list', () => {
    it('returns empty list when no clients exist', async () => {
      const caller = createManagerCaller(db);

      const result = await caller.clients.list();

      expect(result).toEqual([]);
    });

    it('returns all clients', async () => {
      const caller = createManagerCaller(db);
      await createClient(db, { companyName: 'Company A' });
      await createClient(db, { companyName: 'Company B' });

      const result = await caller.clients.list();

      expect(result).toHaveLength(2);
    });

    it('orders by created_at descending', async () => {
      const caller = createManagerCaller(db);
      await createClient(db, { companyName: 'First Client' });
      await createClient(db, { companyName: 'Second Client' });

      const result = await caller.clients.list();

      // Most recently created should be first
      expect(result[0].companyName).toBe('Second Client');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(caller.clients.list()).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('clients.getById', () => {
    it('returns client details', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db, {
        companyName: 'Test Corp',
        contactName: 'John Doe',
        email: 'john@testcorp.com',
      });

      const result = await caller.clients.getById({ id: client.id });

      expect(result).toMatchObject({
        companyName: 'Test Corp',
        contactName: 'John Doe',
        email: 'john@testcorp.com',
      });
    });

    it('returns undefined for non-existent client', async () => {
      const caller = createManagerCaller(db);

      const result = await caller.clients.getById({ id: 9999 });

      expect(result).toBeUndefined();
    });
  });

  describe('clients.create', () => {
    it('creates a client when called by admin', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.clients.create({
        companyName: 'New Company',
        contactName: 'Jane Smith',
        email: 'jane@newcompany.com',
        phone: '555-1234',
        address: '123 Main St',
        notes: 'VIP client',
      });

      expect(result).toMatchObject({
        companyName: 'New Company',
        contactName: 'Jane Smith',
        email: 'jane@newcompany.com',
        phone: '555-1234',
      });
      expect(result.id).toBeDefined();
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);

      await expect(
        caller.clients.create({
          companyName: 'Test',
          contactName: 'Test',
          email: 'test@test.com',
        })
      ).rejects.toThrow('FORBIDDEN');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.clients.create({
          companyName: 'Test',
          contactName: 'Test',
          email: 'test@test.com',
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('validates email format', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.clients.create({
          companyName: 'Test',
          contactName: 'Test',
          email: 'not-an-email',
        })
      ).rejects.toThrow();
    });
  });

  describe('clients.update', () => {
    it('updates client details', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db, { companyName: 'Original Name' });

      const result = await caller.clients.update({
        id: client.id,
        companyName: 'Updated Name',
        phone: '555-9999',
      });

      expect(result.companyName).toBe('Updated Name');
      expect(result.phone).toBe('555-9999');
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);

      await expect(
        caller.clients.update({
          id: client.id,
          companyName: 'New Name',
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  // ============================================
  // Client Events
  // ============================================

  describe('clients.getClientEvents', () => {
    it('returns events for client', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      await createEvent(db, client.id, 1, { eventName: 'Birthday Party' });
      await createEvent(db, client.id, 1, { eventName: 'Corporate Dinner' });

      const result = await caller.clients.getClientEvents({ clientId: client.id });

      expect(result).toHaveLength(2);
    });

    it('excludes archived events', async () => {
      const adminCaller = createAdminCaller(db);
      const client = await createClient(db);
      const event1 = await createEvent(db, client.id, 1, {
        eventName: 'Active Event',
        status: 'planning',
      });
      const event2 = await createEvent(db, client.id, 1, {
        eventName: 'Completed Event',
        status: 'completed',
      });

      // Archive event2
      await adminCaller.event.archive({ id: event2.id });

      const managerCaller = createManagerCaller(db);
      const result = await managerCaller.clients.getClientEvents({ clientId: client.id });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(event1.id);
    });

    it('returns empty list for client with no events', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);

      const result = await caller.clients.getClientEvents({ clientId: client.id });

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // Communication Management
  // ============================================

  describe('clients.recordCommunication', () => {
    it('records a communication', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.clients.recordCommunication({
        eventId: event.id,
        clientId: client.id,
        type: 'email',
        subject: 'Event confirmation',
        notes: 'Confirmed details for upcoming event',
      });

      expect(result).toMatchObject({
        type: 'email',
        subject: 'Event confirmation',
        followUpCompleted: false,
      });
      expect(result.id).toBeDefined();
    });

    it('records communication with follow-up date', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const followUpDate = new Date('2026-02-01');

      const result = await caller.clients.recordCommunication({
        eventId: event.id,
        clientId: client.id,
        type: 'phone',
        notes: 'Discussed menu options',
        followUpDate,
      });

      expect(result.followUpDate).toBeDefined();
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await expect(
        caller.clients.recordCommunication({
          eventId: event.id,
          clientId: client.id,
          type: 'email',
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('clients.listCommunications', () => {
    it('returns communications for client', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      await createCommunication(db, event.id, client.id, { type: 'email' });
      await createCommunication(db, event.id, client.id, { type: 'phone' });

      const result = await caller.clients.listCommunications({ clientId: client.id });

      expect(result.communications).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('supports pagination', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      await createCommunication(db, event.id, client.id);
      await createCommunication(db, event.id, client.id);
      await createCommunication(db, event.id, client.id);

      const page1 = await caller.clients.listCommunications({
        clientId: client.id,
        limit: 2,
        offset: 0,
      });

      expect(page1.communications).toHaveLength(2);
      expect(page1.total).toBe(3);

      const page2 = await caller.clients.listCommunications({
        clientId: client.id,
        limit: 2,
        offset: 2,
      });

      expect(page2.communications).toHaveLength(1);
    });

    it('returns empty list for client with no communications', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);

      const result = await caller.clients.listCommunications({ clientId: client.id });

      expect(result.communications).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('clients.scheduleFollowUp', () => {
    it('schedules a follow-up date', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const communication = await createCommunication(db, event.id, client.id);
      const followUpDate = new Date('2026-02-15');

      const result = await caller.clients.scheduleFollowUp({
        communicationId: communication.id,
        followUpDate,
      });

      expect(result.followUpDate).toBeDefined();
      expect(result.followUpCompleted).toBe(false);
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const communication = await createCommunication(db, event.id, client.id);

      await expect(
        caller.clients.scheduleFollowUp({
          communicationId: communication.id,
          followUpDate: new Date(),
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('clients.completeFollowUp', () => {
    it('marks follow-up as completed', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const communication = await createCommunication(db, event.id, client.id, {
        followUpDate: new Date('2026-01-15'),
        followUpCompleted: false,
      });

      const result = await caller.clients.completeFollowUp({
        communicationId: communication.id,
      });

      expect(result.followUpCompleted).toBe(true);
    });

    it('allows manager users (protected)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const communication = await createCommunication(db, event.id, client.id);

      const result = await caller.clients.completeFollowUp({
        communicationId: communication.id,
      });

      expect(result.followUpCompleted).toBe(true);
    });
  });

  describe('clients.getDueFollowUps', () => {
    it('returns due follow-ups', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      // Create a communication with a past follow-up date (due)
      await createCommunication(db, event.id, client.id, {
        followUpDate: new Date('2025-01-01'),
        followUpCompleted: false,
      });

      const result = await caller.clients.getDueFollowUps();

      expect(result.followUps).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.followUps[0].daysOverdue).toBeGreaterThan(0);
    });

    it('excludes completed follow-ups', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      // Create a completed follow-up
      await createCommunication(db, event.id, client.id, {
        followUpDate: new Date('2025-01-01'),
        followUpCompleted: true,
      });

      const result = await caller.clients.getDueFollowUps();

      expect(result.followUps).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('excludes future follow-ups', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      // Create a future follow-up
      await createCommunication(db, event.id, client.id, {
        followUpDate: new Date('2027-12-31'),
        followUpCompleted: false,
      });

      const result = await caller.clients.getDueFollowUps();

      expect(result.followUps).toHaveLength(0);
    });
  });

  // ============================================
  // Communication - Additional Tests
  // ============================================

  describe('clients.recordCommunication - additional', () => {
    it('sets contactedBy to session user ID', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.clients.recordCommunication({
        eventId: event.id,
        clientId: client.id,
        type: 'email',
      });

      expect(result.contactedBy).toBe(1); // admin user ID
    });

    it('records with all optional fields', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const contactedAt = new Date('2026-01-20T10:00:00Z');
      const followUpDate = new Date('2026-02-01');

      const result = await caller.clients.recordCommunication({
        eventId: event.id,
        clientId: client.id,
        type: 'meeting',
        subject: 'Menu Planning',
        notes: 'Discussed 3-course options',
        contactedAt,
        followUpDate,
      });

      expect(result).toMatchObject({
        type: 'meeting',
        subject: 'Menu Planning',
        notes: 'Discussed 3-course options',
        followUpCompleted: false,
      });
      expect(result.contactedAt).toBeDefined();
      expect(result.followUpDate).toBeDefined();
    });
  });

  describe('clients.listCommunications - join data', () => {
    it('includes event and user join data', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db, { companyName: 'Join Test Corp' });
      const event = await createEvent(db, client.id, 1, { eventName: 'Join Test Event' });
      await createCommunication(db, event.id, client.id, {
        contactedBy: 1, // admin user
        type: 'email',
        subject: 'Test Subject',
      });

      const result = await caller.clients.listCommunications({ clientId: client.id });

      expect(result.communications).toHaveLength(1);
      const comm = result.communications[0];
      // Check join data is present
      expect(comm.event).toBeDefined();
      expect(comm.event?.eventName).toBe('Join Test Event');
      expect(comm.contactedByUser).toBeDefined();
      expect(comm.contactedByUser?.name).toBe('Test Admin');
    });
  });

  describe('clients.getDueFollowUps - accuracy', () => {
    it('calculates daysOverdue accurately', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      // Set follow-up to exactly 10 days ago
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      tenDaysAgo.setHours(0, 0, 0, 0);

      await createCommunication(db, event.id, client.id, {
        followUpDate: tenDaysAgo,
        followUpCompleted: false,
      });

      const result = await caller.clients.getDueFollowUps();

      expect(result.followUps).toHaveLength(1);
      // Allow ±1 day tolerance for timezone/midnight boundary
      expect(result.followUps[0].daysOverdue).toBeGreaterThanOrEqual(9);
      expect(result.followUps[0].daysOverdue).toBeLessThanOrEqual(11);
    });

    it('handles multiple due follow-ups for same client', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      // Create 3 overdue follow-ups
      await createCommunication(db, event.id, client.id, {
        followUpDate: new Date('2025-01-01'),
        followUpCompleted: false,
      });
      await createCommunication(db, event.id, client.id, {
        followUpDate: new Date('2025-06-01'),
        followUpCompleted: false,
      });
      await createCommunication(db, event.id, client.id, {
        followUpDate: new Date('2025-12-01'),
        followUpCompleted: false,
      });

      const result = await caller.clients.getDueFollowUps();

      expect(result.followUps).toHaveLength(3);
      expect(result.count).toBe(3);
    });

    it('includes client and event join data', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db, { companyName: 'Follow-Up Corp' });
      const event = await createEvent(db, client.id, 1, { eventName: 'Follow-Up Event' });

      await createCommunication(db, event.id, client.id, {
        followUpDate: new Date('2025-01-01'),
        followUpCompleted: false,
      });

      const result = await caller.clients.getDueFollowUps();

      expect(result.followUps).toHaveLength(1);
      expect(result.followUps[0].client.companyName).toBe('Follow-Up Corp');
      expect(result.followUps[0].event.eventName).toBe('Follow-Up Event');
    });
  });

  // ============================================
  // Portal Access Management
  // ============================================

  describe('clients.enablePortalAccess', () => {
    it('creates a client user and enables portal', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db, {
        companyName: 'Portal Corp',
        contactName: 'Portal User',
        email: 'portal@corp.com',
      });

      const result = await caller.clients.enablePortalAccess({
        clientId: client.id,
        contactEmail: 'portal@corp.com',
        sendWelcome: false,
      });

      expect(result.success).toBe(true);
      expect(result.client.portalEnabled).toBe(true);
      expect(result.client.portalEnabledAt).toBeDefined();

      // Verify portal user was created
      const portalUser = await caller.clients.getPortalUser({ clientId: client.id });
      expect(portalUser).not.toBeNull();
      expect(portalUser?.email).toBe('portal@corp.com');
      expect(portalUser?.isActive).toBe(true);
    });

    it('rejects non-existent client', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.clients.enablePortalAccess({
          clientId: 9999,
          contactEmail: 'nobody@test.com',
          sendWelcome: false,
        })
      ).rejects.toThrow('Client not found');
    });

    it('rejects email linked to a different client', async () => {
      const caller = createAdminCaller(db);
      const client1 = await createClient(db, { email: 'c1@test.com' });
      const client2 = await createClient(db, { email: 'c2@test.com' });

      // Enable portal for client1 first
      await caller.clients.enablePortalAccess({
        clientId: client1.id,
        contactEmail: 'shared@test.com',
        sendWelcome: false,
      });

      // Try to enable portal for client2 with the same email
      await expect(
        caller.clients.enablePortalAccess({
          clientId: client2.id,
          contactEmail: 'shared@test.com',
          sendWelcome: false,
        })
      ).rejects.toThrow('Email already associated with another client');
    });

    it('re-enables existing deactivated user', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db, { email: 'reactivate@test.com' });

      // Enable, then disable, then re-enable
      await caller.clients.enablePortalAccess({
        clientId: client.id,
        contactEmail: 'reactivate@test.com',
        sendWelcome: false,
      });
      await caller.clients.disablePortalAccess({ clientId: client.id });

      const result = await caller.clients.enablePortalAccess({
        clientId: client.id,
        contactEmail: 'reactivate@test.com',
        sendWelcome: false,
      });

      expect(result.success).toBe(true);
      expect(result.client.portalEnabled).toBe(true);

      // Verify user is active again
      const portalUser = await caller.clients.getPortalUser({ clientId: client.id });
      expect(portalUser).not.toBeNull();
      expect(portalUser?.isActive).toBe(true);
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);

      await expect(
        caller.clients.enablePortalAccess({
          clientId: client.id,
          contactEmail: 'test@test.com',
          sendWelcome: false,
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('clients.disablePortalAccess', () => {
    it('deactivates portal user and disables portal', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db, { email: 'disable@test.com' });

      // Enable first
      await caller.clients.enablePortalAccess({
        clientId: client.id,
        contactEmail: 'disable@test.com',
        sendWelcome: false,
      });

      // Disable
      const result = await caller.clients.disablePortalAccess({ clientId: client.id });

      expect(result.success).toBe(true);
      expect(result.client.portalEnabled).toBe(false);

      // Verify user is deactivated
      const portalUser = await caller.clients.getPortalUser({ clientId: client.id });
      expect(portalUser).not.toBeNull();
      expect(portalUser?.isActive).toBe(false);
    });

    it('rejects manager users (admin only)', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);

      await expect(caller.clients.disablePortalAccess({ clientId: client.id })).rejects.toThrow(
        'FORBIDDEN'
      );
    });
  });

  describe('clients.getPortalUser', () => {
    it('returns null when no portal user exists', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);

      const result = await caller.clients.getPortalUser({ clientId: client.id });

      expect(result).toBeNull();
    });

    it('returns portal user details', async () => {
      const adminCaller = createAdminCaller(db);
      const client = await createClient(db, {
        contactName: 'Jane Portal',
        email: 'jane@portal.com',
      });

      await adminCaller.clients.enablePortalAccess({
        clientId: client.id,
        contactEmail: 'jane@portal.com',
        sendWelcome: false,
      });

      const managerCaller = createManagerCaller(db);
      const result = await managerCaller.clients.getPortalUser({ clientId: client.id });

      expect(result).not.toBeNull();
      expect(result?.email).toBe('jane@portal.com');
      expect(result?.name).toBe('Jane Portal');
      expect(result?.isActive).toBe(true);
    });
  });
});
