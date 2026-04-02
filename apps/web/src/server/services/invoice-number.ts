import { invoices } from '@catering-event-manager/database/schema';
import { desc, like } from 'drizzle-orm';

/**
 * Generates a unique invoice number in the format INV-YYYYMMDD-NNN.
 * The sequence number (NNN) resets daily and auto-increments.
 */
// biome-ignore lint/suspicious/noExplicitAny: accepts any Drizzle db instance
export async function generateInvoiceNumber(db: any): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-${dateStr}-`;

  // Find the highest sequence number for today
  const [result] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `${prefix}%`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  let sequence = 1;
  if (result) {
    const lastSeq = parseInt(result.invoiceNumber.split('-')[2], 10);
    if (!Number.isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(3, '0')}`;
}
