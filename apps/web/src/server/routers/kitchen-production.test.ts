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
  createKitchenStation,
  createProductionTask,
  createUser,
  createVenue,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('kitchenProduction router', () => {
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
  // Station CRUD
  // ============================================

  describe('station.list', () => {
    it('returns empty list when no stations exist', async () => {
      const caller = createManagerCaller(db);
      const result = await caller.kitchenProduction.station.list();
      expect(result).toEqual([]);
    });

    it('returns active stations', async () => {
      const caller = createManagerCaller(db);
      await createKitchenStation(db, { name: 'Oven A' });
      await createKitchenStation(db, { name: 'Grill B', type: 'grill' });
      await createKitchenStation(db, { name: 'Inactive', isActive: false });

      const result = await caller.kitchenProduction.station.list();
      expect(result).toHaveLength(2);
    });

    it('filters by type', async () => {
      const caller = createManagerCaller(db);
      await createKitchenStation(db, { name: 'Oven', type: 'oven' });
      await createKitchenStation(db, { name: 'Grill', type: 'grill' });

      const result = await caller.kitchenProduction.station.list({ type: 'grill' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Grill');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(caller.kitchenProduction.station.list()).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('station.create', () => {
    it('creates a station with required fields', async () => {
      const caller = createAdminCaller(db);
      const result = await caller.kitchenProduction.station.create({
        name: 'Main Oven',
        type: 'oven',
      });
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Main Oven');
      expect(result.type).toBe('oven');
      expect(result.capacity).toBe(1);
      expect(result.isActive).toBe(true);
    });

    it('creates with capacity and venue', async () => {
      const caller = createAdminCaller(db);
      const venue = await createVenue(db, { name: 'Test Venue' });

      const result = await caller.kitchenProduction.station.create({
        name: 'Large Oven',
        type: 'oven',
        capacity: 3,
        venueId: venue.id,
      });
      expect(result.capacity).toBe(3);
      expect(result.venueId).toBe(venue.id);
    });

    it('rejects manager users', async () => {
      const caller = createManagerCaller(db);
      await expect(
        caller.kitchenProduction.station.create({ name: 'Test', type: 'oven' })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('station.update', () => {
    it('updates station fields', async () => {
      const caller = createAdminCaller(db);
      const station = await createKitchenStation(db, { name: 'Old Name' });

      const result = await caller.kitchenProduction.station.update({
        id: station.id,
        name: 'New Name',
        capacity: 5,
      });
      expect(result.name).toBe('New Name');
      expect(result.capacity).toBe(5);
    });

    it('can deactivate a station', async () => {
      const caller = createAdminCaller(db);
      const station = await createKitchenStation(db);

      const result = await caller.kitchenProduction.station.update({
        id: station.id,
        isActive: false,
      });
      expect(result.isActive).toBe(false);
    });

    it('throws NOT_FOUND for non-existent station', async () => {
      const caller = createAdminCaller(db);
      await expect(
        caller.kitchenProduction.station.update({ id: 9999, name: 'Nope' })
      ).rejects.toThrow('Kitchen station not found');
    });
  });

  // ============================================
  // Production Task CRUD
  // ============================================

  describe('task.create', () => {
    it('creates a production task with computed times', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.kitchenProduction.task.create({
        eventId: event.id,
        name: 'Marinate chicken',
        prepType: 'marinate',
        durationMinutes: 60,
        offsetMinutes: -1440,
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Marinate chicken');
      expect(result.prepType).toBe('marinate');
      expect(result.durationMinutes).toBe(60);
      expect(result.offsetMinutes).toBe(-1440);
      expect(result.scheduledStart).toBeDefined();
      expect(result.scheduledEnd).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.isAutoGenerated).toBe(false);
    });

    it('throws NOT_FOUND for non-existent event', async () => {
      const caller = createAdminCaller(db);
      await expect(
        caller.kitchenProduction.task.create({
          eventId: 9999,
          name: 'Test',
          prepType: 'chop',
          durationMinutes: 30,
          offsetMinutes: -240,
        })
      ).rejects.toThrow('Event not found');
    });

    it('rejects manager users', async () => {
      const caller = createManagerCaller(db);
      await expect(
        caller.kitchenProduction.task.create({
          eventId: 1,
          name: 'Test',
          prepType: 'chop',
          durationMinutes: 30,
          offsetMinutes: -240,
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('task.updateStatus', () => {
    it('allows manager to update status', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createProductionTask(db, event.id);

      const result = await caller.kitchenProduction.task.updateStatus({
        id: task.id,
        status: 'in_progress',
      });
      expect(result.status).toBe('in_progress');
    });

    it('throws NOT_FOUND for non-existent task', async () => {
      const caller = createManagerCaller(db);
      await expect(
        caller.kitchenProduction.task.updateStatus({ id: 9999, status: 'completed' })
      ).rejects.toThrow('Production task not found');
    });
  });

  describe('task.delete', () => {
    it('deletes a production task', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const task = await createProductionTask(db, event.id);

      const result = await caller.kitchenProduction.task.delete({ id: task.id });
      expect(result.id).toBe(task.id);

      // Verify deleted
      await expect(caller.kitchenProduction.task.getById({ id: task.id })).rejects.toThrow(
        'Production task not found'
      );
    });
  });

  // ============================================
  // Timeline
  // ============================================

  describe('timeline.getByEvent', () => {
    it('returns tasks ordered by scheduledStart with joins', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const station = await createKitchenStation(db, { name: 'Main Oven' });

      await createProductionTask(db, event.id, {
        name: 'Task B',
        offsetMinutes: -120,
        stationId: station.id,
        scheduledStart: new Date('2026-06-15T08:00:00Z'),
      });
      await createProductionTask(db, event.id, {
        name: 'Task A',
        offsetMinutes: -240,
        scheduledStart: new Date('2026-06-15T06:00:00Z'),
      });

      const result = await caller.kitchenProduction.timeline.getByEvent({ eventId: event.id });
      expect(result).toHaveLength(2);
      expect(result[0].task.name).toBe('Task A');
      expect(result[1].task.name).toBe('Task B');
      expect(result[1].stationName).toBe('Main Oven');
    });

    it('returns empty list for event with no tasks', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.kitchenProduction.timeline.getByEvent({ eventId: event.id });
      expect(result).toEqual([]);
    });
  });

  describe('timeline.recalculate', () => {
    it('recomputes scheduled times for all tasks', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createProductionTask(db, event.id, {
        name: 'Task 1',
        offsetMinutes: -240,
        durationMinutes: 60,
      });
      await createProductionTask(db, event.id, {
        name: 'Task 2',
        offsetMinutes: -120,
        durationMinutes: 30,
      });

      const result = await caller.kitchenProduction.timeline.recalculate({
        eventId: event.id,
      });
      expect(result.updated).toBe(2);
    });

    it('throws NOT_FOUND for non-existent event', async () => {
      const caller = createAdminCaller(db);
      await expect(
        caller.kitchenProduction.timeline.recalculate({ eventId: 9999 })
      ).rejects.toThrow('Event not found');
    });
  });
});
