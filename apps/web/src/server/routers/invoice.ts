import {
  clients,
  events,
  invoiceLineItems,
  invoiceStatusEnum,
  invoices,
} from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { generateInvoiceNumber } from '../services/invoice-number';
import { adminProcedure, protectedProcedure, router } from '../trpc';

// Input schemas
const lineItemInput = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Quantity must be a valid decimal'),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Unit price must be a valid decimal'),
});

const createInvoiceInput = z.object({
  eventId: z.number().positive(),
  lineItems: z.array(lineItemInput).min(1, 'At least one line item is required'),
  taxRate: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, 'Tax rate must be a valid decimal')
    .optional()
    .default('0.0000'),
  notes: z.string().trim().optional(),
  dueDate: z.coerce.date().optional(),
});

const updateInvoiceInput = z.object({
  id: z.number().positive(),
  lineItems: z.array(lineItemInput).min(1).optional(),
  taxRate: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/)
    .optional(),
  notes: z.string().trim().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

const updateStatusInput = z.object({
  id: z.number().positive(),
  newStatus: z.enum(invoiceStatusEnum.enumValues),
});

const listInput = z.object({
  eventId: z.number().positive().optional(),
  status: z.enum(invoiceStatusEnum.enumValues).optional(),
});

const getByIdInput = z.object({
  id: z.number().positive(),
});

const deleteInput = z.object({
  id: z.number().positive(),
});

const listByEventInput = z.object({
  eventId: z.number().positive(),
});

/** Calculate line item amount = quantity * unitPrice, rounded to 2 decimal places */
function calcLineAmount(quantity: string, unitPrice: string): string {
  return (Math.round(parseFloat(quantity) * parseFloat(unitPrice) * 100) / 100).toFixed(2);
}

/** Calculate totals from line items and tax rate */
function calcTotals(lineItems: { quantity: string; unitPrice: string }[], taxRate: string) {
  let subtotal = 0;
  for (const item of lineItems) {
    subtotal += parseFloat(calcLineAmount(item.quantity, item.unitPrice));
  }
  subtotal = Math.round(subtotal * 100) / 100;
  const taxRateNum = parseFloat(taxRate);
  const taxAmount = Math.round(subtotal * taxRateNum * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return {
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    total: total.toFixed(2),
  };
}

// Valid status transitions
const validTransitions: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: ['cancelled'],
  cancelled: [],
};

export const invoiceRouter = router({
  create: adminProcedure.input(createInvoiceInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    // Verify event exists
    const event = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, input.eventId))
      .then((rows) => rows[0]);

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
    }

    const invoiceNumber = await generateInvoiceNumber(db);
    const { subtotal, taxAmount, total } = calcTotals(input.lineItems, input.taxRate);

    // Transaction: create invoice + line items
    const result = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          eventId: input.eventId,
          invoiceNumber,
          status: 'draft',
          subtotal,
          taxRate: input.taxRate,
          taxAmount,
          total,
          notes: input.notes ?? null,
          dueDate: input.dueDate ?? null,
          createdBy: Number(session.user.id),
        })
        .returning();

      const lineItemValues = input.lineItems.map((item, idx) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: calcLineAmount(item.quantity, item.unitPrice),
        sortOrder: idx,
      }));

      const createdLineItems = await tx.insert(invoiceLineItems).values(lineItemValues).returning();

      return { invoice, lineItems: createdLineItems };
    });

    logger.info('Invoice created', {
      invoiceId: result.invoice.id,
      invoiceNumber,
      eventId: input.eventId,
      context: 'invoice.create',
    });

    return {
      ...result.invoice,
      lineItems: result.lineItems,
    };
  }),

  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    let query = db.select().from(invoices);

    if (input.eventId) {
      query = query.where(eq(invoices.eventId, input.eventId)) as typeof query;
    }
    if (input.status) {
      query = query.where(eq(invoices.status, input.status)) as typeof query;
    }

    const results = await query.orderBy(sql`${invoices.createdAt} DESC`);
    return results;
  }),

  getById: protectedProcedure.input(getByIdInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, input.id))
      .then((rows) => rows[0]);

    if (!invoice) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, input.id))
      .orderBy(invoiceLineItems.sortOrder);

    // Get event + client info for display
    const event = await db
      .select({
        id: events.id,
        eventName: events.eventName,
        eventDate: events.eventDate,
        clientId: events.clientId,
      })
      .from(events)
      .where(eq(events.id, invoice.eventId))
      .then((rows) => rows[0]);

    let client = null;
    if (event) {
      client = await db
        .select({
          id: clients.id,
          companyName: clients.companyName,
          contactName: clients.contactName,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
        })
        .from(clients)
        .where(eq(clients.id, event.clientId))
        .then((rows) => rows[0]);
    }

    return {
      ...invoice,
      lineItems,
      event: event || null,
      client: client || null,
    };
  }),

  updateStatus: adminProcedure.input(updateStatusInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    const invoice = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, input.id))
      .then((rows) => rows[0]);

    if (!invoice) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    // Validate status transition
    const allowed = validTransitions[invoice.status] || [];
    if (!allowed.includes(input.newStatus)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot transition from '${invoice.status}' to '${input.newStatus}'`,
      });
    }

    const updateData: Record<string, unknown> = {
      status: input.newStatus,
      updatedAt: new Date(),
    };

    // Set sentAt when transitioning to 'sent'
    if (input.newStatus === 'sent') {
      updateData.sentAt = new Date();
    }

    const [updated] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, input.id))
      .returning();

    logger.info('Invoice status updated', {
      invoiceId: input.id,
      oldStatus: invoice.status,
      newStatus: input.newStatus,
      context: 'invoice.updateStatus',
    });

    return updated;
  }),

  update: adminProcedure.input(updateInvoiceInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const { id, ...updates } = input;

    const invoice = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, id))
      .then((rows) => rows[0]);

    if (!invoice) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    if (invoice.status !== 'draft') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only draft invoices can be edited',
      });
    }

    const result = await db.transaction(async (tx) => {
      const invoiceUpdate: Record<string, unknown> = { updatedAt: new Date() };

      if (updates.notes !== undefined) invoiceUpdate.notes = updates.notes;
      if (updates.dueDate !== undefined) invoiceUpdate.dueDate = updates.dueDate;

      // If line items are provided, replace all existing ones and recalculate
      if (updates.lineItems) {
        const taxRate = updates.taxRate ?? '0.0000';
        const { subtotal, taxAmount, total } = calcTotals(updates.lineItems, taxRate);

        invoiceUpdate.subtotal = subtotal;
        invoiceUpdate.taxRate = taxRate;
        invoiceUpdate.taxAmount = taxAmount;
        invoiceUpdate.total = total;

        // Delete existing line items
        await tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));

        // Insert new line items
        const lineItemValues = updates.lineItems.map((item, idx) => ({
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: calcLineAmount(item.quantity, item.unitPrice),
          sortOrder: idx,
        }));

        await tx.insert(invoiceLineItems).values(lineItemValues);
      } else if (updates.taxRate !== undefined) {
        // Recalculate with existing line items
        const existingItems = await tx
          .select({ quantity: invoiceLineItems.quantity, unitPrice: invoiceLineItems.unitPrice })
          .from(invoiceLineItems)
          .where(eq(invoiceLineItems.invoiceId, id));

        const { subtotal, taxAmount, total } = calcTotals(
          existingItems.map((i) => ({
            quantity: i.quantity ?? '1.00',
            unitPrice: i.unitPrice ?? '0.00',
          })),
          updates.taxRate
        );

        invoiceUpdate.subtotal = subtotal;
        invoiceUpdate.taxRate = updates.taxRate;
        invoiceUpdate.taxAmount = taxAmount;
        invoiceUpdate.total = total;
      }

      const [updated] = await tx
        .update(invoices)
        .set(invoiceUpdate)
        .where(eq(invoices.id, id))
        .returning();

      const lineItems = await tx
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, id))
        .orderBy(invoiceLineItems.sortOrder);

      return { invoice: updated, lineItems };
    });

    logger.info('Invoice updated', { invoiceId: id, context: 'invoice.update' });

    return {
      ...result.invoice,
      lineItems: result.lineItems,
    };
  }),

  delete: adminProcedure.input(deleteInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    const invoice = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, input.id))
      .then((rows) => rows[0]);

    if (!invoice) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    if (invoice.status !== 'draft') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only draft invoices can be deleted',
      });
    }

    // Line items cascade-delete via FK
    await db.delete(invoices).where(eq(invoices.id, input.id));

    logger.info('Invoice deleted', { invoiceId: input.id, context: 'invoice.delete' });

    return { success: true };
  }),

  listByEvent: protectedProcedure.input(listByEventInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const results = await db
      .select()
      .from(invoices)
      .where(eq(invoices.eventId, input.eventId))
      .orderBy(sql`${invoices.createdAt} DESC`);

    return results;
  }),
});
