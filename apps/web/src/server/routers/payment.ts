import { invoices, paymentMethodEnum, payments } from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { adminProcedure, protectedProcedure, router } from '../trpc';

const recordPaymentInput = z.object({
  invoiceId: z.number().positive(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal'),
  method: z.enum(paymentMethodEnum.enumValues),
  paymentDate: z.coerce.date(),
  reference: z.string().trim().max(255).optional(),
  notes: z.string().trim().optional(),
});

const listByInvoiceInput = z.object({
  invoiceId: z.number().positive(),
});

const deletePaymentInput = z.object({
  id: z.number().positive(),
});

export const paymentRouter = router({
  record: adminProcedure.input(recordPaymentInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    // Verify invoice exists and get current state
    const invoice = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        total: invoices.total,
      })
      .from(invoices)
      .where(eq(invoices.id, input.invoiceId))
      .then((rows) => rows[0]);

    if (!invoice) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    if (invoice.status === 'cancelled' || invoice.status === 'draft') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot record payment on a ${invoice.status} invoice`,
      });
    }

    // Record the payment
    const [payment] = await db
      .insert(payments)
      .values({
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.method,
        paymentDate: input.paymentDate,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        recordedBy: Number(session.user.id),
      })
      .returning();

    // Check if invoice is fully paid
    const totalPaidResult = (await db.execute(
      sql`SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE invoice_id = ${input.invoiceId}`
    )) as unknown as { total_paid: string }[];

    const totalPaid = parseFloat(totalPaidResult[0]?.total_paid || '0');
    const invoiceTotal = parseFloat(invoice.total ?? '0');

    if (totalPaid >= invoiceTotal) {
      await db
        .update(invoices)
        .set({ status: 'paid', updatedAt: new Date() })
        .where(eq(invoices.id, input.invoiceId));

      logger.info('Invoice auto-transitioned to paid', {
        invoiceId: input.invoiceId,
        totalPaid,
        invoiceTotal,
        context: 'payment.record',
      });
    }

    logger.info('Payment recorded', {
      paymentId: payment.id,
      invoiceId: input.invoiceId,
      amount: input.amount,
      context: 'payment.record',
    });

    return {
      ...payment,
      invoiceFullyPaid: totalPaid >= invoiceTotal,
    };
  }),

  listByInvoice: protectedProcedure.input(listByInvoiceInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    // Get invoice total
    const invoice = await db
      .select({ total: invoices.total })
      .from(invoices)
      .where(eq(invoices.id, input.invoiceId))
      .then((rows) => rows[0]);

    if (!invoice) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    const paymentList = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, input.invoiceId))
      .orderBy(sql`${payments.paymentDate} ASC`);

    // Calculate running balance
    const invoiceTotal = parseFloat(invoice.total ?? '0');
    let runningPaid = 0;
    const paymentsWithBalance = paymentList.map((p) => {
      runningPaid += parseFloat(p.amount ?? '0');
      return {
        ...p,
        runningTotal: Math.round(runningPaid * 100) / 100,
        remainingBalance: Math.round((invoiceTotal - runningPaid) * 100) / 100,
      };
    });

    return {
      payments: paymentsWithBalance,
      invoiceTotal,
      totalPaid: Math.round(runningPaid * 100) / 100,
      remainingBalance: Math.round((invoiceTotal - runningPaid) * 100) / 100,
    };
  }),

  delete: adminProcedure.input(deletePaymentInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    const payment = await db
      .select({ id: payments.id, invoiceId: payments.invoiceId })
      .from(payments)
      .where(eq(payments.id, input.id))
      .then((rows) => rows[0]);

    if (!payment) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' });
    }

    await db.delete(payments).where(eq(payments.id, input.id));

    // Check if invoice should revert from 'paid' to 'sent'
    const invoice = await db
      .select({ id: invoices.id, status: invoices.status, total: invoices.total })
      .from(invoices)
      .where(eq(invoices.id, payment.invoiceId))
      .then((rows) => rows[0]);

    if (invoice && invoice.status === 'paid') {
      const totalPaidResult = (await db.execute(
        sql`SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE invoice_id = ${payment.invoiceId}`
      )) as unknown as { total_paid: string }[];

      const totalPaid = parseFloat(totalPaidResult[0]?.total_paid || '0');
      const invoiceTotal = parseFloat(invoice.total ?? '0');

      if (totalPaid < invoiceTotal) {
        await db
          .update(invoices)
          .set({ status: 'sent', updatedAt: new Date() })
          .where(eq(invoices.id, payment.invoiceId));

        logger.info('Invoice reverted to sent after payment deletion', {
          invoiceId: payment.invoiceId,
          context: 'payment.delete',
        });
      }
    }

    logger.info('Payment deleted', { paymentId: input.id, context: 'payment.delete' });

    return { success: true };
  }),
});
