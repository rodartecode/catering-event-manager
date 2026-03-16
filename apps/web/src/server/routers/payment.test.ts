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
  createInvoice,
  createPayment,
  createUser,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('payment router', () => {
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

  describe('payment.record', () => {
    it('records a payment on a sent invoice', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, {
        status: 'sent',
        total: '500.00',
      });

      const result = await caller.payment.record({
        invoiceId: invoice.id,
        amount: '200.00',
        method: 'credit_card',
        paymentDate: new Date('2026-04-01'),
        reference: 'CC-1234',
      });

      expect(result.amount).toBe('200.00');
      expect(result.method).toBe('credit_card');
      expect(result.invoiceFullyPaid).toBe(false);
    });

    it('auto-transitions invoice to paid when fully paid', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, {
        status: 'sent',
        total: '500.00',
      });

      // First partial payment
      await caller.payment.record({
        invoiceId: invoice.id,
        amount: '300.00',
        method: 'bank_transfer',
        paymentDate: new Date(),
      });

      // Second payment covers the rest
      const result = await caller.payment.record({
        invoiceId: invoice.id,
        amount: '200.00',
        method: 'bank_transfer',
        paymentDate: new Date(),
      });

      expect(result.invoiceFullyPaid).toBe(true);

      // Verify invoice status changed
      const updated = await caller.invoice.getById({ id: invoice.id });
      expect(updated.status).toBe('paid');
    });

    it('rejects payment on draft invoice', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, { status: 'draft' });

      await expect(
        caller.payment.record({
          invoiceId: invoice.id,
          amount: '100.00',
          method: 'cash',
          paymentDate: new Date(),
        })
      ).rejects.toThrow('Cannot record payment on a draft invoice');
    });

    it('rejects payment on cancelled invoice', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, { status: 'cancelled' });

      await expect(
        caller.payment.record({
          invoiceId: invoice.id,
          amount: '100.00',
          method: 'cash',
          paymentDate: new Date(),
        })
      ).rejects.toThrow('Cannot record payment on a cancelled invoice');
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.payment.record({
          invoiceId: 1,
          amount: '100.00',
          method: 'cash',
          paymentDate: new Date(),
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('payment.listByInvoice', () => {
    it('returns payments with running balance', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, {
        status: 'sent',
        total: '1000.00',
      });

      await createPayment(db, invoice.id, 1, {
        amount: '400.00',
        paymentDate: new Date('2026-04-01'),
      });
      await createPayment(db, invoice.id, 1, {
        amount: '300.00',
        paymentDate: new Date('2026-04-02'),
      });

      const result = await caller.payment.listByInvoice({ invoiceId: invoice.id });

      expect(result.invoiceTotal).toBe(1000);
      expect(result.totalPaid).toBe(700);
      expect(result.remainingBalance).toBe(300);
      expect(result.payments).toHaveLength(2);
      expect(result.payments[0].runningTotal).toBe(400);
      expect(result.payments[0].remainingBalance).toBe(600);
      expect(result.payments[1].runningTotal).toBe(700);
      expect(result.payments[1].remainingBalance).toBe(300);
    });

    it('allows manager access', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, { status: 'sent', total: '100.00' });

      const result = await caller.payment.listByInvoice({ invoiceId: invoice.id });
      expect(result.payments).toHaveLength(0);
    });
  });

  describe('payment.delete', () => {
    it('deletes a payment and reverts invoice status if needed', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, {
        status: 'paid',
        total: '500.00',
      });

      const payment = await createPayment(db, invoice.id, 1, { amount: '500.00' });

      const result = await caller.payment.delete({ id: payment.id });
      expect(result.success).toBe(true);

      // Invoice should revert to 'sent'
      const updated = await caller.invoice.getById({ id: invoice.id });
      expect(updated.status).toBe('sent');
    });

    it('rejects when payment does not exist', async () => {
      const caller = createAdminCaller(db);
      await expect(caller.payment.delete({ id: 99999 })).rejects.toThrow('Payment not found');
    });
  });
});
