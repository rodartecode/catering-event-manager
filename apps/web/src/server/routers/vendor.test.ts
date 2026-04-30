import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../../test/helpers/db';
import {
  createClient,
  createEvent,
  createEventVendor,
  createUser,
  createVendor,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('vendor router', () => {
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
  // vendor.list
  // ============================================

  describe('vendor.list', () => {
    it('returns empty list when no vendors exist', async () => {
      const caller = createManagerCaller(db);
      expect(await caller.vendor.list()).toEqual([]);
    });

    it('returns active vendors only by default', async () => {
      await createVendor(db, { companyName: 'Active Vendor' });
      await createVendor(db, { companyName: 'Inactive Vendor', isActive: false });

      const caller = createManagerCaller(db);
      const result = await caller.vendor.list();
      expect(result).toHaveLength(1);
      expect(result[0].companyName).toBe('Active Vendor');
    });

    it('orders by companyName ascending', async () => {
      await createVendor(db, { companyName: 'Zeta Florals' });
      await createVendor(db, { companyName: 'Alpha Rentals' });

      const caller = createManagerCaller(db);
      const result = await caller.vendor.list();
      expect(result[0].companyName).toBe('Alpha Rentals');
      expect(result[1].companyName).toBe('Zeta Florals');
    });

    it('filters by service type', async () => {
      await createVendor(db, { companyName: 'Photog Co', serviceType: 'photography' });
      await createVendor(db, { companyName: 'Floral Co', serviceType: 'florals' });

      const caller = createManagerCaller(db);
      const result = await caller.vendor.list({ serviceType: 'photography' });
      expect(result).toHaveLength(1);
      expect(result[0].companyName).toBe('Photog Co');
    });

    it('filters by company name search', async () => {
      await createVendor(db, { companyName: 'Acme Rentals', serviceType: 'rentals' });
      await createVendor(db, { companyName: 'Globex Decor', serviceType: 'decor' });

      const caller = createManagerCaller(db);
      const result = await caller.vendor.list({ query: 'acme' });
      expect(result).toHaveLength(1);
      expect(result[0].companyName).toBe('Acme Rentals');
    });

    it('filters by contact name and email search', async () => {
      await createVendor(db, {
        companyName: 'Vendor One',
        contactName: 'Alice Walker',
        email: 'alice@one.com',
      });
      await createVendor(db, {
        companyName: 'Vendor Two',
        contactName: 'Bob Smith',
        email: 'bob@two.com',
      });

      const caller = createManagerCaller(db);
      const byContact = await caller.vendor.list({ query: 'walker' });
      expect(byContact).toHaveLength(1);
      expect(byContact[0].companyName).toBe('Vendor One');

      const byEmail = await caller.vendor.list({ query: 'two.com' });
      expect(byEmail).toHaveLength(1);
      expect(byEmail[0].companyName).toBe('Vendor Two');
    });

    it('returns inactive vendors when isActive=false', async () => {
      await createVendor(db, { companyName: 'Active' });
      await createVendor(db, { companyName: 'Inactive', isActive: false });

      const caller = createManagerCaller(db);
      const result = await caller.vendor.list({ isActive: false });
      expect(result).toHaveLength(1);
      expect(result[0].companyName).toBe('Inactive');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(caller.vendor.list()).rejects.toThrow('UNAUTHORIZED');
    });
  });

  // ============================================
  // vendor.getById
  // ============================================

  describe('vendor.getById', () => {
    it('returns vendor with assignedEventCount=0 when never assigned', async () => {
      const vendor = await createVendor(db, { companyName: 'Solo Vendor' });

      const caller = createManagerCaller(db);
      const result = await caller.vendor.getById({ id: vendor.id });
      expect(result.companyName).toBe('Solo Vendor');
      expect(result.assignedEventCount).toBe(0);
    });

    it('returns assignedEventCount reflecting junction rows', async () => {
      const client = await createClient(db);
      const vendor = await createVendor(db);
      const event1 = await createEvent(db, client.id, 1);
      const event2 = await createEvent(db, client.id, 1);
      await createEventVendor(db, event1.id, vendor.id);
      await createEventVendor(db, event2.id, vendor.id);

      const caller = createManagerCaller(db);
      const result = await caller.vendor.getById({ id: vendor.id });
      expect(result.assignedEventCount).toBe(2);
    });

    it('throws NOT_FOUND for missing vendor', async () => {
      const caller = createManagerCaller(db);
      await expect(caller.vendor.getById({ id: 9999 })).rejects.toThrow('Vendor not found');
    });
  });

  // ============================================
  // vendor.create
  // ============================================

  describe('vendor.create', () => {
    it('creates vendor with required fields', async () => {
      const caller = createAdminCaller(db);
      const result = await caller.vendor.create({
        companyName: 'New Florals Co',
        serviceType: 'florals',
      });
      expect(result.id).toBeDefined();
      expect(result.companyName).toBe('New Florals Co');
      expect(result.serviceType).toBe('florals');
      expect(result.isActive).toBe(true);
    });

    it('creates vendor with all fields', async () => {
      const caller = createAdminCaller(db);
      const result = await caller.vendor.create({
        companyName: 'Premium AV',
        contactName: 'Sound Guy',
        email: 'av@premium.com',
        phone: '555-9999',
        serviceType: 'av',
        notes: 'Backline equipment specialist',
      });
      expect(result.contactName).toBe('Sound Guy');
      expect(result.email).toBe('av@premium.com');
      expect(result.notes).toBe('Backline equipment specialist');
    });

    it('rejects manager users', async () => {
      const caller = createManagerCaller(db);
      await expect(
        caller.vendor.create({ companyName: 'Test', serviceType: 'other' })
      ).rejects.toThrow('FORBIDDEN');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(
        caller.vendor.create({ companyName: 'Test', serviceType: 'other' })
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });

  // ============================================
  // vendor.update
  // ============================================

  describe('vendor.update', () => {
    it('updates vendor fields', async () => {
      const vendor = await createVendor(db, { companyName: 'Old Name' });
      const caller = createAdminCaller(db);

      const result = await caller.vendor.update({
        id: vendor.id,
        companyName: 'New Name',
        serviceType: 'rentals',
      });
      expect(result.companyName).toBe('New Name');
      expect(result.serviceType).toBe('rentals');
    });

    it('can deactivate vendor', async () => {
      const vendor = await createVendor(db);
      const caller = createAdminCaller(db);

      const result = await caller.vendor.update({ id: vendor.id, isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('throws NOT_FOUND for missing vendor', async () => {
      const caller = createAdminCaller(db);
      await expect(caller.vendor.update({ id: 9999, companyName: 'x' })).rejects.toThrow(
        'Vendor not found'
      );
    });

    it('rejects manager users', async () => {
      const vendor = await createVendor(db);
      const caller = createManagerCaller(db);
      await expect(caller.vendor.update({ id: vendor.id, companyName: 'Nope' })).rejects.toThrow(
        'FORBIDDEN'
      );
    });
  });

  // ============================================
  // vendor.assignToEvent
  // ============================================

  describe('vendor.assignToEvent', () => {
    it('creates an event-vendor assignment', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const vendor = await createVendor(db, { serviceType: 'photography' });

      const caller = createAdminCaller(db);
      const result = await caller.vendor.assignToEvent({
        eventId: event.id,
        vendorId: vendor.id,
        role: 'Lead photographer',
        cost: '1200.00',
        notes: 'Includes 5h coverage',
      });

      expect(result.eventId).toBe(event.id);
      expect(result.vendorId).toBe(vendor.id);
      expect(result.role).toBe('Lead photographer');
      expect(result.cost).toBe('1200.00');
    });

    it('rejects duplicate assignments with BAD_REQUEST', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const vendor = await createVendor(db);
      await createEventVendor(db, event.id, vendor.id);

      const caller = createAdminCaller(db);
      await expect(
        caller.vendor.assignToEvent({ eventId: event.id, vendorId: vendor.id })
      ).rejects.toThrow('already assigned');
    });

    it('throws NOT_FOUND for missing event', async () => {
      const vendor = await createVendor(db);
      const caller = createAdminCaller(db);
      await expect(
        caller.vendor.assignToEvent({ eventId: 9999, vendorId: vendor.id })
      ).rejects.toThrow('Event not found');
    });

    it('throws NOT_FOUND for missing vendor', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const caller = createAdminCaller(db);
      await expect(
        caller.vendor.assignToEvent({ eventId: event.id, vendorId: 9999 })
      ).rejects.toThrow('Vendor not found');
    });

    it('rejects manager users', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const vendor = await createVendor(db);
      const caller = createManagerCaller(db);
      await expect(
        caller.vendor.assignToEvent({ eventId: event.id, vendorId: vendor.id })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  // ============================================
  // vendor.updateAssignment
  // ============================================

  describe('vendor.updateAssignment', () => {
    it('updates role and cost on a junction row', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const vendor = await createVendor(db);
      const assignment = await createEventVendor(db, event.id, vendor.id, {
        role: 'Initial role',
        cost: '500.00',
      });

      const caller = createAdminCaller(db);
      const result = await caller.vendor.updateAssignment({
        id: assignment.id,
        role: 'Updated role',
        cost: '750.00',
      });
      expect(result.role).toBe('Updated role');
      expect(result.cost).toBe('750.00');
    });

    it('throws NOT_FOUND for missing assignment', async () => {
      const caller = createAdminCaller(db);
      await expect(caller.vendor.updateAssignment({ id: 9999, role: 'x' })).rejects.toThrow(
        'Vendor assignment not found'
      );
    });
  });

  // ============================================
  // vendor.unassignFromEvent
  // ============================================

  describe('vendor.unassignFromEvent', () => {
    it('removes the junction row', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const vendor = await createVendor(db);
      await createEventVendor(db, event.id, vendor.id);

      const caller = createAdminCaller(db);
      const result = await caller.vendor.unassignFromEvent({
        eventId: event.id,
        vendorId: vendor.id,
      });
      expect(result.success).toBe(true);

      const remaining = await caller.vendor.listByEvent({ eventId: event.id });
      expect(remaining).toHaveLength(0);
    });

    it('throws NOT_FOUND when no assignment exists', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const vendor = await createVendor(db);
      const caller = createAdminCaller(db);
      await expect(
        caller.vendor.unassignFromEvent({ eventId: event.id, vendorId: vendor.id })
      ).rejects.toThrow('Vendor assignment not found');
    });
  });

  // ============================================
  // vendor.listByEvent
  // ============================================

  describe('vendor.listByEvent', () => {
    it('returns joined vendor details for an event', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const florist = await createVendor(db, {
        companyName: 'Floral Co',
        serviceType: 'florals',
      });
      const photog = await createVendor(db, {
        companyName: 'Photog Co',
        serviceType: 'photography',
      });
      await createEventVendor(db, event.id, florist.id, { role: 'Floral arrangements' });
      await createEventVendor(db, event.id, photog.id, { role: 'Lead photographer' });

      const caller = createManagerCaller(db);
      const result = await caller.vendor.listByEvent({ eventId: event.id });
      expect(result).toHaveLength(2);
      // sorted by companyName
      expect(result[0].companyName).toBe('Floral Co');
      expect(result[0].serviceType).toBe('florals');
      expect(result[0].role).toBe('Floral arrangements');
      expect(result[1].companyName).toBe('Photog Co');
    });

    it('returns empty array for event with no vendors', async () => {
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const caller = createManagerCaller(db);
      expect(await caller.vendor.listByEvent({ eventId: event.id })).toEqual([]);
    });
  });
});
