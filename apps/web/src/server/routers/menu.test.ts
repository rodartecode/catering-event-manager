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
  createEventMenu,
  createEventMenuItem,
  createMenuItem,
  createUser,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('menu router', () => {
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

  // ── Catalog CRUD ──

  describe('menu.createItem', () => {
    it('creates a menu item with all fields', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.menu.createItem({
        name: 'Grilled Salmon',
        description: 'Atlantic salmon with lemon butter',
        costPerPerson: '18.50',
        category: 'main',
        allergens: ['fish', 'dairy'],
        dietaryTags: ['gluten_free'],
      });

      expect(result).toMatchObject({
        name: 'Grilled Salmon',
        description: 'Atlantic salmon with lemon butter',
        costPerPerson: '18.50',
        category: 'main',
        allergens: ['fish', 'dairy'],
        dietaryTags: ['gluten_free'],
        isActive: true,
      });
      expect(result.id).toBeDefined();
      expect(result.createdBy).toBe(1);
    });

    it('creates a menu item with minimal fields', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.menu.createItem({
        name: 'Water',
        costPerPerson: '0.50',
        category: 'beverage',
      });

      expect(result).toMatchObject({
        name: 'Water',
        costPerPerson: '0.50',
        category: 'beverage',
        allergens: [],
        dietaryTags: [],
      });
    });

    it('rejects when called by manager', async () => {
      const caller = createManagerCaller(db);

      await expect(
        caller.menu.createItem({
          name: 'Test Item',
          costPerPerson: '10.00',
          category: 'main',
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('rejects when unauthenticated', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.menu.createItem({
          name: 'Test Item',
          costPerPerson: '10.00',
          category: 'main',
        })
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('rejects invalid cost format', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.menu.createItem({
          name: 'Test Item',
          costPerPerson: 'abc',
          category: 'main',
        })
      ).rejects.toThrow();
    });
  });

  describe('menu.updateItem', () => {
    it('updates a menu item', async () => {
      const caller = createAdminCaller(db);
      const item = await createMenuItem(db, 1, { name: 'Old Name', costPerPerson: '10.00' });

      const result = await caller.menu.updateItem({
        id: item.id,
        name: 'New Name',
        costPerPerson: '15.00',
        allergens: ['nuts'],
      });

      expect(result.name).toBe('New Name');
      expect(result.costPerPerson).toBe('15.00');
      expect(result.allergens).toEqual(['nuts']);
    });

    it('returns NOT_FOUND for non-existent item', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.menu.updateItem({ id: 9999, name: 'Nope' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('menu.deleteItem', () => {
    it('soft-deletes a menu item', async () => {
      const caller = createAdminCaller(db);
      const item = await createMenuItem(db, 1);

      const result = await caller.menu.deleteItem({ id: item.id });
      expect(result.isActive).toBe(false);

      // Verify it's filtered out from active-only list
      const list = await caller.menu.listItems({});
      expect(list.find((i) => i.id === item.id)).toBeUndefined();
    });

    it('returns NOT_FOUND for non-existent item', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.menu.deleteItem({ id: 9999 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('menu.listItems', () => {
    it('lists active items only by default', async () => {
      const caller = createAdminCaller(db);
      await createMenuItem(db, 1, { name: 'Active Item', isActive: true });
      await createMenuItem(db, 1, { name: 'Inactive Item', isActive: false });

      const result = await caller.menu.listItems({});
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Active Item');
    });

    it('lists all items when activeOnly is false', async () => {
      const caller = createAdminCaller(db);
      await createMenuItem(db, 1, { isActive: true });
      await createMenuItem(db, 1, { isActive: false });

      const result = await caller.menu.listItems({ activeOnly: false });
      expect(result).toHaveLength(2);
    });

    it('filters by category', async () => {
      const caller = createAdminCaller(db);
      await createMenuItem(db, 1, { category: 'appetizer' });
      await createMenuItem(db, 1, { category: 'main' });
      await createMenuItem(db, 1, { category: 'dessert' });

      const result = await caller.menu.listItems({ category: 'main' });
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('main');
    });

    it('is accessible to managers', async () => {
      const caller = createManagerCaller(db);
      await createMenuItem(db, 1);

      const result = await caller.menu.listItems({});
      expect(result).toHaveLength(1);
    });
  });

  describe('menu.getItemById', () => {
    it('returns a menu item', async () => {
      const caller = createAdminCaller(db);
      const item = await createMenuItem(db, 1, { name: 'Test Item' });

      const result = await caller.menu.getItemById({ id: item.id });
      expect(result.name).toBe('Test Item');
    });

    it('returns NOT_FOUND for non-existent item', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.menu.getItemById({ id: 9999 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  // ── Event Menu CRUD ──

  describe('menu.createEventMenu', () => {
    it('creates an event menu', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.menu.createEventMenu({
        eventId: event.id,
        name: 'Dinner Service',
        notes: 'Main course service',
      });

      expect(result).toMatchObject({
        eventId: event.id,
        name: 'Dinner Service',
        notes: 'Main course service',
        sortOrder: 0,
      });
      expect(result.id).toBeDefined();
    });

    it('returns NOT_FOUND for non-existent event', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.menu.createEventMenu({ eventId: 9999, name: 'Test' })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('menu.updateEventMenu', () => {
    it('updates event menu name and notes', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const menu = await createEventMenu(db, event.id, { name: 'Old Name' });

      const result = await caller.menu.updateEventMenu({
        id: menu.id,
        name: 'New Name',
        notes: 'Updated notes',
      });

      expect(result.name).toBe('New Name');
      expect(result.notes).toBe('Updated notes');
    });

    it('returns NOT_FOUND for non-existent menu', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.menu.updateEventMenu({ id: 9999, name: 'Nope' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('menu.deleteEventMenu', () => {
    it('deletes event menu and cascades to items', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const menu = await createEventMenu(db, event.id);
      const item = await createMenuItem(db, 1);
      await createEventMenuItem(db, menu.id, item.id);

      const result = await caller.menu.deleteEventMenu({ id: menu.id });
      expect(result.success).toBe(true);

      // Verify menus list is empty
      const menus = await caller.menu.listEventMenus({ eventId: event.id });
      expect(menus).toHaveLength(0);
    });
  });

  describe('menu.addItemToEventMenu', () => {
    it('adds an item to event menu', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const menu = await createEventMenu(db, event.id);
      const item = await createMenuItem(db, 1);

      const result = await caller.menu.addItemToEventMenu({
        eventMenuId: menu.id,
        menuItemId: item.id,
        quantityOverride: 50,
        notes: 'Extra portion',
      });

      expect(result).toMatchObject({
        eventMenuId: menu.id,
        menuItemId: item.id,
        quantityOverride: 50,
        notes: 'Extra portion',
      });
    });

    it('rejects adding inactive item', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const menu = await createEventMenu(db, event.id);
      const item = await createMenuItem(db, 1, { isActive: false });

      await expect(
        caller.menu.addItemToEventMenu({
          eventMenuId: menu.id,
          menuItemId: item.id,
        })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rejects duplicate menu item in same event menu', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const menu = await createEventMenu(db, event.id);
      const item = await createMenuItem(db, 1);

      await caller.menu.addItemToEventMenu({
        eventMenuId: menu.id,
        menuItemId: item.id,
      });

      await expect(
        caller.menu.addItemToEventMenu({
          eventMenuId: menu.id,
          menuItemId: item.id,
        })
      ).rejects.toThrow();
    });

    it('returns NOT_FOUND for non-existent menu', async () => {
      const caller = createAdminCaller(db);
      const item = await createMenuItem(db, 1);

      await expect(
        caller.menu.addItemToEventMenu({
          eventMenuId: 9999,
          menuItemId: item.id,
        })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('returns NOT_FOUND for non-existent menu item', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const menu = await createEventMenu(db, event.id);

      await expect(
        caller.menu.addItemToEventMenu({
          eventMenuId: menu.id,
          menuItemId: 9999,
        })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('menu.removeItemFromEventMenu', () => {
    it('removes an item from event menu', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const menu = await createEventMenu(db, event.id);
      const item = await createMenuItem(db, 1);
      const entry = await createEventMenuItem(db, menu.id, item.id);

      const result = await caller.menu.removeItemFromEventMenu({ id: entry.id });
      expect(result.success).toBe(true);
    });

    it('returns NOT_FOUND for non-existent entry', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.menu.removeItemFromEventMenu({ id: 9999 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('menu.updateEventMenuItem', () => {
    it('updates quantity override and notes', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const menu = await createEventMenu(db, event.id);
      const item = await createMenuItem(db, 1);
      const entry = await createEventMenuItem(db, menu.id, item.id);

      const result = await caller.menu.updateEventMenuItem({
        id: entry.id,
        quantityOverride: 75,
        notes: 'Increased for VIP section',
      });

      expect(result.quantityOverride).toBe(75);
      expect(result.notes).toBe('Increased for VIP section');
    });

    it('clears quantity override when set to null', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const menu = await createEventMenu(db, event.id);
      const item = await createMenuItem(db, 1);
      const entry = await createEventMenuItem(db, menu.id, item.id, { quantityOverride: 50 });

      const result = await caller.menu.updateEventMenuItem({
        id: entry.id,
        quantityOverride: null,
      });

      expect(result.quantityOverride).toBeNull();
    });
  });

  // ── Queries ──

  describe('menu.listEventMenus', () => {
    it('returns menus with items for an event', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const menu = await createEventMenu(db, event.id, { name: 'Dinner' });
      const item1 = await createMenuItem(db, 1, { name: 'Salmon', costPerPerson: '18.00' });
      const item2 = await createMenuItem(db, 1, { name: 'Salad', costPerPerson: '8.00' });
      await createEventMenuItem(db, menu.id, item1.id);
      await createEventMenuItem(db, menu.id, item2.id);

      const result = await caller.menu.listEventMenus({ eventId: event.id });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Dinner');
      expect(result[0].items).toHaveLength(2);
      expect(result[0].items[0].menuItem.name).toBe('Salmon');
    });

    it('returns empty array for event with no menus', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.menu.listEventMenus({ eventId: event.id });
      expect(result).toEqual([]);
    });
  });

  describe('menu.getEventMenuCostEstimate', () => {
    it('calculates cost using estimated_attendees when no override', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1, { estimatedAttendees: 100 });

      const menu = await createEventMenu(db, event.id);
      const item = await createMenuItem(db, 1, { costPerPerson: '15.00' });
      await createEventMenuItem(db, menu.id, item.id);

      const result = await caller.menu.getEventMenuCostEstimate({ eventId: event.id });
      expect(result.totalEstimate).toBe(1500);
      expect(result.estimatedAttendees).toBe(100);
      expect(result.itemCount).toBe(1);
    });

    it('uses quantity override when set', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1, { estimatedAttendees: 100 });

      const menu = await createEventMenu(db, event.id);
      const item = await createMenuItem(db, 1, { costPerPerson: '10.00' });
      await createEventMenuItem(db, menu.id, item.id, { quantityOverride: 50 });

      const result = await caller.menu.getEventMenuCostEstimate({ eventId: event.id });
      expect(result.totalEstimate).toBe(500);
    });

    it('calculates breakdown by menu and category', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1, { estimatedAttendees: 10 });

      const dinner = await createEventMenu(db, event.id, { name: 'Dinner' });
      const cocktail = await createEventMenu(db, event.id, { name: 'Cocktail Hour' });

      const mainItem = await createMenuItem(db, 1, { costPerPerson: '20.00', category: 'main' });
      const appetizerItem = await createMenuItem(db, 1, {
        costPerPerson: '8.00',
        category: 'appetizer',
      });

      await createEventMenuItem(db, dinner.id, mainItem.id);
      await createEventMenuItem(db, cocktail.id, appetizerItem.id);

      const result = await caller.menu.getEventMenuCostEstimate({ eventId: event.id });
      expect(result.totalEstimate).toBe(280); // (20*10) + (8*10)
      expect(result.byMenu).toHaveLength(2);
      expect(result.byCategory).toHaveLength(2);
    });

    it('returns NOT_FOUND for non-existent event', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.menu.getEventMenuCostEstimate({ eventId: 9999 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('menu.getEventDietarySummary', () => {
    it('aggregates allergens and dietary tags across items', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const menu = await createEventMenu(db, event.id);
      const item1 = await createMenuItem(db, 1, {
        allergens: ['nuts', 'dairy'],
        dietaryTags: ['gluten_free'],
      });
      const item2 = await createMenuItem(db, 1, {
        allergens: ['dairy', 'soy'],
        dietaryTags: ['gluten_free', 'vegan'],
      });

      await createEventMenuItem(db, menu.id, item1.id);
      await createEventMenuItem(db, menu.id, item2.id);

      const result = await caller.menu.getEventDietarySummary({ eventId: event.id });
      expect(result.allergens).toEqual(['dairy', 'nuts', 'soy']); // sorted, deduplicated
      expect(result.dietaryTags).toEqual(['gluten_free', 'vegan']); // sorted, deduplicated
      expect(result.itemCount).toBe(2);
    });

    it('returns empty arrays for event with no menus', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.menu.getEventDietarySummary({ eventId: event.id });
      expect(result.allergens).toEqual([]);
      expect(result.dietaryTags).toEqual([]);
      expect(result.itemCount).toBe(0);
    });
  });

  describe('menu.getShoppingList', () => {
    it('aggregates items across concurrent events', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);

      const event1 = await createEvent(db, client.id, 1, {
        eventDate: new Date('2026-06-15'),
        estimatedAttendees: 50,
      });
      const event2 = await createEvent(db, client.id, 1, {
        eventDate: new Date('2026-06-20'),
        estimatedAttendees: 30,
      });

      const item = await createMenuItem(db, 1, {
        name: 'Chicken Breast',
        costPerPerson: '12.00',
        category: 'main',
      });

      const menu1 = await createEventMenu(db, event1.id);
      const menu2 = await createEventMenu(db, event2.id);
      await createEventMenuItem(db, menu1.id, item.id);
      await createEventMenuItem(db, menu2.id, item.id);

      const result = await caller.menu.getShoppingList({
        dateFrom: new Date('2026-06-01'),
        dateTo: new Date('2026-06-30'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Chicken Breast');
      expect(result[0].totalQuantity).toBe(80); // 50 + 30
      expect(result[0].estimatedCost).toBe(960); // 12 * 80
      expect(result[0].eventCount).toBe(2);
    });

    it('excludes archived events', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);

      const event = await createEvent(db, client.id, 1, {
        eventDate: new Date('2026-06-15'),
        estimatedAttendees: 50,
        status: 'completed',
      });

      // Archive the event
      const { sql: sqlTag } = await import('drizzle-orm');
      await db.execute(
        sqlTag`UPDATE events SET is_archived = true, archived_at = NOW(), archived_by = 1 WHERE id = ${event.id}`
      );

      const item = await createMenuItem(db, 1);
      const menu = await createEventMenu(db, event.id);
      await createEventMenuItem(db, menu.id, item.id);

      const result = await caller.menu.getShoppingList({
        dateFrom: new Date('2026-06-01'),
        dateTo: new Date('2026-06-30'),
      });

      expect(result).toHaveLength(0);
    });

    it('respects quantity overrides', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);

      const event = await createEvent(db, client.id, 1, {
        eventDate: new Date('2026-06-15'),
        estimatedAttendees: 100,
      });

      const item = await createMenuItem(db, 1, { costPerPerson: '5.00' });
      const menu = await createEventMenu(db, event.id);
      await createEventMenuItem(db, menu.id, item.id, { quantityOverride: 200 });

      const result = await caller.menu.getShoppingList({
        dateFrom: new Date('2026-06-01'),
        dateTo: new Date('2026-06-30'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].totalQuantity).toBe(200);
      expect(result[0].estimatedCost).toBe(1000); // 5 * 200
    });

    it('returns empty array when no events in date range', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.menu.getShoppingList({
        dateFrom: new Date('2030-01-01'),
        dateTo: new Date('2030-12-31'),
      });

      expect(result).toEqual([]);
    });
  });
});
