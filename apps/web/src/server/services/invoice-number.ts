import { type SQLWrapper, sql } from 'drizzle-orm';

/**
 * Generates a unique invoice number in the format INV-YYYYMMDD-NNN.
 * The sequence number (NNN) resets daily and auto-increments.
 */
export async function generateInvoiceNumber(db: {
  execute: (query: string | SQLWrapper) => Promise<unknown[]>;
}): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-${dateStr}-`;

  // Find the highest sequence number for today
  const result = (await db.execute(
    sql`SELECT invoice_number FROM invoices WHERE invoice_number LIKE ${`${prefix}%`} ORDER BY invoice_number DESC LIMIT 1`
  )) as unknown as { invoice_number: string }[];

  let sequence = 1;
  if (result.length > 0) {
    const lastNumber = result[0].invoice_number;
    const lastSeq = parseInt(lastNumber.split('-')[2], 10);
    if (!Number.isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(3, '0')}`;
}
