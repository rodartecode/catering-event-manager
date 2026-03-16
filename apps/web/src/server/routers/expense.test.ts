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
  createExpense,
  createUser,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('expense router', () => {
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

  describe('expense.create', () => {
    it('creates an expense when called by admin', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.expense.create({
        eventId: event.id,
        category: 'food_supplies',
        description: 'Organic produce delivery',
        amount: '250.50',
        vendor: 'Local Farm Co',
        expenseDate: new Date('2026-04-01'),
        notes: 'Weekly delivery',
      });

      expect(result).toMatchObject({
        eventId: event.id,
        category: 'food_supplies',
        description: 'Organic produce delivery',
        amount: '250.50',
        vendor: 'Local Farm Co',
        notes: 'Weekly delivery',
      });
      expect(result.id).toBeDefined();
      expect(result.createdBy).toBe(1);
    });

    it('creates an expense without optional fields', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.expense.create({
        eventId: event.id,
        category: 'labor',
        description: 'Staff overtime',
        amount: '500.00',
        expenseDate: new Date('2026-04-01'),
      });

      expect(result.vendor).toBeNull();
      expect(result.notes).toBeNull();
    });

    it('rejects when event does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.expense.create({
          eventId: 99999,
          category: 'labor',
          description: 'Staff overtime',
          amount: '500.00',
          expenseDate: new Date('2026-04-01'),
        })
      ).rejects.toThrow('Event not found');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.expense.create({
          eventId: 1,
          category: 'labor',
          description: 'Test',
          amount: '100.00',
          expenseDate: new Date(),
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('rejects non-admin users', async () => {
      const caller = createManagerCaller(db);

      await expect(
        caller.expense.create({
          eventId: 1,
          category: 'labor',
          description: 'Test',
          amount: '100.00',
          expenseDate: new Date(),
        })
      ).rejects.toThrow('FORBIDDEN');
    });

    it('rejects invalid amount format', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.expense.create({
          eventId: 1,
          category: 'labor',
          description: 'Test',
          amount: 'not-a-number',
          expenseDate: new Date(),
        })
      ).rejects.toThrow();
    });
  });

  describe('expense.update', () => {
    it('updates expense fields', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const expense = await createExpense(db, event.id, 1, {
        description: 'Original',
        amount: '100.00',
      });

      const result = await caller.expense.update({
        id: expense.id,
        description: 'Updated description',
        amount: '200.00',
        vendor: 'New Vendor',
      });

      expect(result.description).toBe('Updated description');
      expect(result.amount).toBe('200.00');
      expect(result.vendor).toBe('New Vendor');
    });

    it('clears nullable fields when set to null', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const expense = await createExpense(db, event.id, 1, {
        vendor: 'Some Vendor',
        notes: 'Some notes',
      });

      const result = await caller.expense.update({
        id: expense.id,
        vendor: null,
        notes: null,
      });

      expect(result.vendor).toBeNull();
      expect(result.notes).toBeNull();
    });

    it('rejects when expense does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.expense.update({ id: 99999, description: 'Updated' })).rejects.toThrow(
        'Expense not found'
      );
    });
  });

  describe('expense.delete', () => {
    it('deletes an expense', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const expense = await createExpense(db, event.id, 1);

      const result = await caller.expense.delete({ id: expense.id });
      expect(result.success).toBe(true);

      // Verify it's gone
      const list = await caller.expense.listByEvent({ eventId: event.id });
      expect(list).toHaveLength(0);
    });

    it('rejects when expense does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.expense.delete({ id: 99999 })).rejects.toThrow('Expense not found');
    });
  });

  describe('expense.listByEvent', () => {
    it('returns expenses for an event ordered by date descending', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createExpense(db, event.id, 1, {
        description: 'First expense',
        expenseDate: new Date('2026-03-01'),
      });
      await createExpense(db, event.id, 1, {
        description: 'Second expense',
        expenseDate: new Date('2026-03-15'),
      });
      await createExpense(db, event.id, 1, {
        description: 'Third expense',
        expenseDate: new Date('2026-03-10'),
      });

      const result = await caller.expense.listByEvent({ eventId: event.id });

      expect(result).toHaveLength(3);
      // Most recent first
      expect(result[0].description).toBe('Second expense');
      expect(result[1].description).toBe('Third expense');
      expect(result[2].description).toBe('First expense');
    });

    it('returns empty array when no expenses exist', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.expense.listByEvent({ eventId: event.id });
      expect(result).toHaveLength(0);
    });

    it('does not return expenses from other events', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event1 = await createEvent(db, client.id, 1, { eventName: 'Event 1' });
      const event2 = await createEvent(db, client.id, 1, { eventName: 'Event 2' });

      await createExpense(db, event1.id, 1, { description: 'Event 1 expense' });
      await createExpense(db, event2.id, 1, { description: 'Event 2 expense' });

      const result = await caller.expense.listByEvent({ eventId: event1.id });
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Event 1 expense');
    });

    it('allows manager (protected) access', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.expense.listByEvent({ eventId: event.id });
      expect(result).toHaveLength(0);
    });
  });

  describe('expense.getEventCostSummary', () => {
    it('returns total and category breakdown', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createExpense(db, event.id, 1, { category: 'food_supplies', amount: '150.00' });
      await createExpense(db, event.id, 1, { category: 'food_supplies', amount: '75.50' });
      await createExpense(db, event.id, 1, { category: 'labor', amount: '300.00' });
      await createExpense(db, event.id, 1, { category: 'equipment_rental', amount: '200.00' });

      const result = await caller.expense.getEventCostSummary({ eventId: event.id });

      expect(result.totalExpenses).toBe(725.5);
      expect(result.expenseCount).toBe(4);
      expect(result.byCategory).toContainEqual({ category: 'food_supplies', total: 225.5 });
      expect(result.byCategory).toContainEqual({ category: 'labor', total: 300.0 });
      expect(result.byCategory).toContainEqual({ category: 'equipment_rental', total: 200.0 });
    });

    it('returns zero totals when no expenses exist', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.expense.getEventCostSummary({ eventId: event.id });

      expect(result.totalExpenses).toBe(0);
      expect(result.expenseCount).toBe(0);
      expect(result.byCategory).toHaveLength(0);
    });

    it('handles decimal precision correctly', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      // Create expenses that could cause floating point issues
      await createExpense(db, event.id, 1, { category: 'labor', amount: '0.10' });
      await createExpense(db, event.id, 1, { category: 'labor', amount: '0.20' });

      const result = await caller.expense.getEventCostSummary({ eventId: event.id });
      expect(result.totalExpenses).toBe(0.3);
    });
  });
});
