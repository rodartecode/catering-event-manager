import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('search router', () => {
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

  describe('search.global', () => {
    it('returns matching events by event name', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      await createEvent(db, client.id, 1, { eventName: 'Summer Wedding Reception' });
      await createEvent(db, client.id, 1, { eventName: 'Corporate Dinner' });

      const result = await caller.search.global({ query: 'wedding' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventName).toBe('Summer Wedding Reception');
    });

    it('returns matching events by location', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      await createEvent(db, client.id, 1, {
        eventName: 'Party',
        location: 'Grand Ballroom',
      });

      const result = await caller.search.global({ query: 'ballroom' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].location).toBe('Grand Ballroom');
    });

    it('returns matching clients by company name', async () => {
      const caller = createAdminCaller(db);
      await createClient(db, { companyName: 'Acme Catering Corp' });
      await createClient(db, { companyName: 'Beta Foods' });

      const result = await caller.search.global({ query: 'acme' });

      expect(result.clients).toHaveLength(1);
      expect(result.clients[0].companyName).toBe('Acme Catering Corp');
    });

    it('returns matching clients by contact name', async () => {
      const caller = createAdminCaller(db);
      await createClient(db, { contactName: 'Jane Smith' });

      const result = await caller.search.global({ query: 'smith' });

      expect(result.clients).toHaveLength(1);
      expect(result.clients[0].contactName).toBe('Jane Smith');
    });

    it('returns matching clients by email', async () => {
      const caller = createAdminCaller(db);
      await createClient(db, { email: 'jane@acmecorp.com' });

      const result = await caller.search.global({ query: 'acmecorp' });

      expect(result.clients).toHaveLength(1);
      expect(result.clients[0].email).toBe('jane@acmecorp.com');
    });

    it('returns matching tasks by title', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      await createTask(db, event.id, { title: 'Setup Tables and Chairs' });
      await createTask(db, event.id, { title: 'Order Flowers' });

      const result = await caller.search.global({ query: 'setup' });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('Setup Tables and Chairs');
    });

    it('returns matching resources by name', async () => {
      const caller = createAdminCaller(db);
      await createResource(db, { name: 'Head Chef Maria' });
      await createResource(db, { name: 'Portable Oven' });

      const result = await caller.search.global({ query: 'chef' });

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].name).toBe('Head Chef Maria');
    });

    it('performs case-insensitive matching', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      await createEvent(db, client.id, 1, { eventName: 'WEDDING GALA' });

      const result = await caller.search.global({ query: 'wedding' });

      expect(result.events).toHaveLength(1);
    });

    it('returns results from multiple entity types', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db, { companyName: 'Wedding Planners Inc' });
      const event = await createEvent(db, client.id, 1, { eventName: 'Beach Wedding' });
      await createTask(db, event.id, { title: 'Wedding Cake Setup' });
      await createResource(db, { name: 'Wedding Coordinator' });

      const result = await caller.search.global({ query: 'wedding' });

      expect(result.events.length).toBeGreaterThanOrEqual(1);
      expect(result.clients.length).toBeGreaterThanOrEqual(1);
      expect(result.tasks.length).toBeGreaterThanOrEqual(1);
      expect(result.resources.length).toBeGreaterThanOrEqual(1);
    });

    it('excludes archived events', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      await createEvent(db, client.id, 1, { eventName: 'Active Wedding' });
      await createArchivedEvent(db, client.id, 1, undefined, {
        eventName: 'Archived Wedding',
      });

      const result = await caller.search.global({ query: 'wedding' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventName).toBe('Active Wedding');
    });

    it('returns empty arrays when no matches found', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.search.global({ query: 'xyznonexistent' });

      expect(result.events).toHaveLength(0);
      expect(result.clients).toHaveLength(0);
      expect(result.tasks).toHaveLength(0);
      expect(result.resources).toHaveLength(0);
    });

    it('rejects query shorter than 2 characters', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.search.global({ query: 'a' })).rejects.toThrow();
    });

    it('caps results at 5 per entity type', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      for (let i = 0; i < 7; i++) {
        await createEvent(db, client.id, 1, { eventName: `Wedding ${i}` });
      }

      const result = await caller.search.global({ query: 'wedding' });

      expect(result.events).toHaveLength(5);
    });

    it('rejects unauthenticated requests', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(caller.search.global({ query: 'test' })).rejects.toThrow('UNAUTHORIZED');
    });
  });
});
