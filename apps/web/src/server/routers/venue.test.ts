import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../../test/helpers/db';
import { createUser, createVenue, resetFactoryCounter } from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('venue router', () => {
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
  // Venue CRUD Operations
  // ============================================

  describe('venue.list', () => {
    it('returns empty list when no venues exist', async () => {
      const caller = createManagerCaller(db);
      const result = await caller.venue.list();
      expect(result).toEqual([]);
    });

    it('returns all active venues', async () => {
      const caller = createManagerCaller(db);
      await createVenue(db, { name: 'Venue A' });
      await createVenue(db, { name: 'Venue B' });
      await createVenue(db, { name: 'Inactive Venue', isActive: false });

      const result = await caller.venue.list();
      expect(result).toHaveLength(2);
    });

    it('orders by name ascending', async () => {
      const caller = createManagerCaller(db);
      await createVenue(db, { name: 'Zebra Hall' });
      await createVenue(db, { name: 'Alpha Center' });

      const result = await caller.venue.list();
      expect(result[0].name).toBe('Alpha Center');
      expect(result[1].name).toBe('Zebra Hall');
    });

    it('filters by search query on name', async () => {
      const caller = createManagerCaller(db);
      await createVenue(db, { name: 'Grand Ballroom' });
      await createVenue(db, { name: 'Garden Terrace' });

      const result = await caller.venue.list({ query: 'ballroom' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Grand Ballroom');
    });

    it('filters by search query on address', async () => {
      const caller = createManagerCaller(db);
      await createVenue(db, { name: 'Venue A', address: '123 Main St, Downtown' });
      await createVenue(db, { name: 'Venue B', address: '456 Oak Ave, Uptown' });

      const result = await caller.venue.list({ query: 'downtown' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Venue A');
    });

    it('filters by hasKitchen', async () => {
      const caller = createManagerCaller(db);
      await createVenue(db, { name: 'With Kitchen', hasKitchen: true });
      await createVenue(db, { name: 'No Kitchen', hasKitchen: false });

      const result = await caller.venue.list({ hasKitchen: true });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('With Kitchen');
    });

    it('filters by minCapacity', async () => {
      const caller = createManagerCaller(db);
      await createVenue(db, { name: 'Small Venue', capacity: 50 });
      await createVenue(db, { name: 'Large Venue', capacity: 300 });

      const result = await caller.venue.list({ minCapacity: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Large Venue');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(caller.venue.list()).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('venue.getById', () => {
    it('returns venue by id', async () => {
      const caller = createManagerCaller(db);
      const venue = await createVenue(db, {
        name: 'Test Venue',
        address: '123 Test St',
        capacity: 200,
        hasKitchen: true,
        kitchenType: 'full',
      });

      const result = await caller.venue.getById({ id: venue.id });
      expect(result.name).toBe('Test Venue');
      expect(result.address).toBe('123 Test St');
      expect(result.capacity).toBe(200);
      expect(result.hasKitchen).toBe(true);
      expect(result.kitchenType).toBe('full');
    });

    it('throws NOT_FOUND for non-existent venue', async () => {
      const caller = createManagerCaller(db);
      await expect(caller.venue.getById({ id: 9999 })).rejects.toThrow('Venue not found');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(caller.venue.getById({ id: 1 })).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('venue.create', () => {
    it('creates a venue with required fields', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.venue.create({
        name: 'New Venue',
        address: '456 New St',
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('New Venue');
      expect(result.address).toBe('456 New St');
      expect(result.hasKitchen).toBe(false);
      expect(result.isActive).toBe(true);
    });

    it('creates a venue with all fields', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.venue.create({
        name: 'Full Venue',
        address: '789 Full St',
        capacity: 500,
        hasKitchen: true,
        kitchenType: 'full',
        equipmentAvailable: ['oven', 'grill', 'refrigerator'],
        parkingNotes: 'Underground parking available',
        loadInNotes: 'Service entrance on east side',
        contactName: 'Jane Doe',
        contactPhone: '555-1234',
        contactEmail: 'jane@venue.com',
        notes: 'Premium venue',
      });

      expect(result.capacity).toBe(500);
      expect(result.hasKitchen).toBe(true);
      expect(result.kitchenType).toBe('full');
      expect(result.equipmentAvailable).toEqual(['oven', 'grill', 'refrigerator']);
      expect(result.parkingNotes).toBe('Underground parking available');
      expect(result.contactEmail).toBe('jane@venue.com');
    });

    it('rejects manager users', async () => {
      const caller = createManagerCaller(db);
      await expect(caller.venue.create({ name: 'Test', address: '123 St' })).rejects.toThrow(
        'FORBIDDEN'
      );
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(caller.venue.create({ name: 'Test', address: '123 St' })).rejects.toThrow(
        'UNAUTHORIZED'
      );
    });
  });

  describe('venue.update', () => {
    it('updates venue fields', async () => {
      const caller = createAdminCaller(db);
      const venue = await createVenue(db, { name: 'Old Name' });

      const result = await caller.venue.update({
        id: venue.id,
        name: 'New Name',
        capacity: 100,
      });

      expect(result.name).toBe('New Name');
      expect(result.capacity).toBe(100);
    });

    it('can deactivate a venue', async () => {
      const caller = createAdminCaller(db);
      const venue = await createVenue(db, { name: 'Active Venue' });

      const result = await caller.venue.update({
        id: venue.id,
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });

    it('throws NOT_FOUND for non-existent venue', async () => {
      const caller = createAdminCaller(db);
      await expect(caller.venue.update({ id: 9999, name: 'Nope' })).rejects.toThrow(
        'Venue not found'
      );
    });

    it('rejects manager users', async () => {
      const caller = createManagerCaller(db);
      const venue = await createVenue(db);

      await expect(caller.venue.update({ id: venue.id, name: 'Nope' })).rejects.toThrow(
        'FORBIDDEN'
      );
    });
  });
});
