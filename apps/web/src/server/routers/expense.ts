import { events, expenseCategoryEnum, expenses } from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { adminProcedure, protectedProcedure, router } from '../trpc';

// Input schemas
const createExpenseInput = z.object({
  eventId: z.number().positive(),
  category: z.enum(expenseCategoryEnum.enumValues),
  description: z.string().trim().min(1).max(500),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal with up to 2 decimal places'),
  vendor: z.string().trim().max(255).optional(),
  expenseDate: z.coerce.date(),
  notes: z.string().trim().optional(),
});

const updateExpenseInput = z.object({
  id: z.number().positive(),
  category: z.enum(expenseCategoryEnum.enumValues).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal with up to 2 decimal places')
    .optional(),
  vendor: z.string().trim().max(255).nullable().optional(),
  expenseDate: z.coerce.date().optional(),
  notes: z.string().trim().nullable().optional(),
});

const deleteExpenseInput = z.object({
  id: z.number().positive(),
});

const listByEventInput = z.object({
  eventId: z.number().positive(),
});

const getEventCostSummaryInput = z.object({
  eventId: z.number().positive(),
});

export const expenseRouter = router({
  create: adminProcedure.input(createExpenseInput).mutation(async ({ ctx, input }) => {
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

    const [expense] = await db
      .insert(expenses)
      .values({
        eventId: input.eventId,
        category: input.category,
        description: input.description,
        amount: input.amount,
        vendor: input.vendor ?? null,
        expenseDate: input.expenseDate,
        notes: input.notes ?? null,
        createdBy: Number(session.user.id),
      })
      .returning();

    logger.info('Expense created', {
      expenseId: expense.id,
      eventId: input.eventId,
      context: 'expense.create',
    });

    return {
      id: expense.id,
      eventId: expense.eventId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      vendor: expense.vendor,
      expenseDate: expense.expenseDate,
      notes: expense.notes,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }),

  update: adminProcedure.input(updateExpenseInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const { id, ...updates } = input;

    // Verify expense exists
    const existing = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.id, id))
      .then((rows) => rows[0]);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
    }

    // Build update object, only including provided fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
    if (updates.expenseDate !== undefined) updateData.expenseDate = updates.expenseDate;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const [updated] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();

    logger.info('Expense updated', { expenseId: id, context: 'expense.update' });

    return {
      id: updated.id,
      eventId: updated.eventId,
      category: updated.category,
      description: updated.description,
      amount: updated.amount,
      vendor: updated.vendor,
      expenseDate: updated.expenseDate,
      notes: updated.notes,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }),

  delete: adminProcedure.input(deleteExpenseInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    // Verify expense exists
    const existing = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.id, input.id))
      .then((rows) => rows[0]);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
    }

    await db.delete(expenses).where(eq(expenses.id, input.id));

    logger.info('Expense deleted', { expenseId: input.id, context: 'expense.delete' });

    return { success: true };
  }),

  listByEvent: protectedProcedure.input(listByEventInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const results = await db
      .select()
      .from(expenses)
      .where(eq(expenses.eventId, input.eventId))
      .orderBy(sql`${expenses.expenseDate} DESC`);

    return results.map((expense) => ({
      id: expense.id,
      eventId: expense.eventId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      vendor: expense.vendor,
      expenseDate: expense.expenseDate,
      notes: expense.notes,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    }));
  }),

  getEventCostSummary: protectedProcedure
    .input(getEventCostSummaryInput)
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get all expenses for the event
      const eventExpenses = await db
        .select({
          category: expenses.category,
          amount: expenses.amount,
        })
        .from(expenses)
        .where(eq(expenses.eventId, input.eventId));

      // Calculate total
      let total = 0;
      const byCategory: Record<string, number> = {};

      for (const expense of eventExpenses) {
        const amount = parseFloat(expense.amount ?? '0');
        total += amount;

        const cat = expense.category;
        byCategory[cat] = (byCategory[cat] || 0) + amount;
      }

      // Round to 2 decimal places to avoid floating point drift
      const roundedTotal = Math.round(total * 100) / 100;
      const categoryBreakdown = expenseCategoryEnum.enumValues
        .filter((cat) => byCategory[cat] !== undefined)
        .map((cat) => ({
          category: cat,
          total: Math.round((byCategory[cat] || 0) * 100) / 100,
        }));

      return {
        totalExpenses: roundedTotal,
        expenseCount: eventExpenses.length,
        byCategory: categoryBreakdown,
      };
    }),
});
