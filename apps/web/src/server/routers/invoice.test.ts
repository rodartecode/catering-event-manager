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
  createUser,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('invoice router', () => {
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

  describe('invoice.create', () => {
    it('creates an invoice with line items and calculated totals', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.invoice.create({
        eventId: event.id,
        lineItems: [
          { description: 'Catering service', quantity: '1.00', unitPrice: '500.00' },
          { description: 'Setup fee', quantity: '2.00', unitPrice: '75.00' },
        ],
        taxRate: '0.0825',
        dueDate: new Date('2026-05-01'),
        notes: 'Net 30',
      });

      expect(result.eventId).toBe(event.id);
      expect(result.status).toBe('draft');
      expect(result.subtotal).toBe('650.00');
      expect(result.taxRate).toBe('0.0825');
      expect(result.taxAmount).toBe('53.63');
      expect(result.total).toBe('703.63');
      expect(result.invoiceNumber).toMatch(/^INV-\d{8}-\d{3}$/);
      expect(result.lineItems).toHaveLength(2);
      expect(result.lineItems[0].amount).toBe('500.00');
      expect(result.lineItems[1].amount).toBe('150.00');
    });

    it('creates invoice without tax', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'Service', quantity: '1.00', unitPrice: '1000.00' }],
      });

      expect(result.subtotal).toBe('1000.00');
      expect(result.taxAmount).toBe('0.00');
      expect(result.total).toBe('1000.00');
    });

    it('rejects when event does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.invoice.create({
          eventId: 99999,
          lineItems: [{ description: 'Test', quantity: '1.00', unitPrice: '100.00' }],
        })
      ).rejects.toThrow('Event not found');
    });

    it('rejects with no line items', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.invoice.create({
          eventId: 1,
          lineItems: [],
        })
      ).rejects.toThrow();
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.invoice.create({
          eventId: 1,
          lineItems: [{ description: 'Test', quantity: '1.00', unitPrice: '100.00' }],
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('generates unique invoice numbers', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const inv1 = await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'A', quantity: '1.00', unitPrice: '100.00' }],
      });
      const inv2 = await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'B', quantity: '1.00', unitPrice: '200.00' }],
      });

      expect(inv1.invoiceNumber).not.toBe(inv2.invoiceNumber);
    });
  });

  describe('invoice.getById', () => {
    it('returns invoice with line items, event, and client data', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db, { companyName: 'Test Corp' });
      const event = await createEvent(db, client.id, 1, { eventName: 'Gala' });

      const created = await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'Service', quantity: '1.00', unitPrice: '500.00' }],
      });

      const result = await caller.invoice.getById({ id: created.id });

      expect(result.id).toBe(created.id);
      expect(result.lineItems).toHaveLength(1);
      expect(result.event?.eventName).toBe('Gala');
      expect(result.client?.companyName).toBe('Test Corp');
    });

    it('rejects when invoice does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.invoice.getById({ id: 99999 })).rejects.toThrow('Invoice not found');
    });
  });

  describe('invoice.updateStatus', () => {
    it('transitions draft to sent and sets sentAt', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const inv = await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'Service', quantity: '1.00', unitPrice: '100.00' }],
      });

      const result = await caller.invoice.updateStatus({ id: inv.id, newStatus: 'sent' });

      expect(result.status).toBe('sent');
      expect(result.sentAt).not.toBeNull();
    });

    it('transitions sent to paid', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, { status: 'sent' });

      const result = await caller.invoice.updateStatus({ id: invoice.id, newStatus: 'paid' });
      expect(result.status).toBe('paid');
    });

    it('rejects invalid status transitions', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const inv = await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'Service', quantity: '1.00', unitPrice: '100.00' }],
      });

      // draft -> paid is not valid (must go through sent)
      await expect(caller.invoice.updateStatus({ id: inv.id, newStatus: 'paid' })).rejects.toThrow(
        "Cannot transition from 'draft' to 'paid'"
      );
    });

    it('rejects transitions from cancelled', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, { status: 'cancelled' });

      await expect(
        caller.invoice.updateStatus({ id: invoice.id, newStatus: 'sent' })
      ).rejects.toThrow("Cannot transition from 'cancelled' to 'sent'");
    });
  });

  describe('invoice.update', () => {
    it('updates line items and recalculates totals', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const inv = await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'Old', quantity: '1.00', unitPrice: '100.00' }],
      });

      const result = await caller.invoice.update({
        id: inv.id,
        lineItems: [
          { description: 'New A', quantity: '2.00', unitPrice: '200.00' },
          { description: 'New B', quantity: '1.00', unitPrice: '50.00' },
        ],
        taxRate: '0.1000',
      });

      expect(result.subtotal).toBe('450.00');
      expect(result.taxAmount).toBe('45.00');
      expect(result.total).toBe('495.00');
      expect(result.lineItems).toHaveLength(2);
    });

    it('rejects editing non-draft invoices', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, { status: 'sent' });

      await expect(caller.invoice.update({ id: invoice.id, notes: 'Updated' })).rejects.toThrow(
        'Only draft invoices can be edited'
      );
    });
  });

  describe('invoice.delete', () => {
    it('deletes a draft invoice and its line items', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const inv = await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'Service', quantity: '1.00', unitPrice: '100.00' }],
      });

      const result = await caller.invoice.delete({ id: inv.id });
      expect(result.success).toBe(true);

      await expect(caller.invoice.getById({ id: inv.id })).rejects.toThrow('Invoice not found');
    });

    it('rejects deleting non-draft invoices', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const invoice = await createInvoice(db, event.id, 1, { status: 'sent' });

      await expect(caller.invoice.delete({ id: invoice.id })).rejects.toThrow(
        'Only draft invoices can be deleted'
      );
    });
  });

  describe('invoice.listByEvent', () => {
    it('returns invoices for an event ordered by date', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'First', quantity: '1.00', unitPrice: '100.00' }],
      });
      await caller.invoice.create({
        eventId: event.id,
        lineItems: [{ description: 'Second', quantity: '1.00', unitPrice: '200.00' }],
      });

      const result = await caller.invoice.listByEvent({ eventId: event.id });
      expect(result).toHaveLength(2);
    });

    it('allows manager access', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.invoice.listByEvent({ eventId: event.id });
      expect(result).toHaveLength(0);
    });
  });

  describe('invoice.list', () => {
    it('filters by status', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createInvoice(db, event.id, 1, { status: 'draft', invoiceNumber: 'INV-D-001' });
      await createInvoice(db, event.id, 1, { status: 'sent', invoiceNumber: 'INV-S-001' });

      const drafts = await caller.invoice.list({ status: 'draft' });
      expect(drafts).toHaveLength(1);
      expect(drafts[0].status).toBe('draft');
    });
  });
});
