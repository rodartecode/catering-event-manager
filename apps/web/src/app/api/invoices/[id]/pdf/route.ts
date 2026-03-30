export const dynamic = 'force-dynamic';

import { db } from '@catering-event-manager/database/client';
import {
  clients,
  events,
  invoiceLineItems,
  invoices,
} from '@catering-event-manager/database/schema';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth';

function formatCurrency(amount: string | null): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    parseFloat(amount || '0')
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const invoiceId = Number(id);

  const invoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .then((rows) => rows[0]);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(invoiceLineItems.sortOrder);

  const event = await db
    .select({ eventName: events.eventName, eventDate: events.eventDate, clientId: events.clientId })
    .from(events)
    .where(eq(events.id, invoice.eventId))
    .then((rows) => rows[0]);

  let client = null;
  if (event) {
    client = await db
      .select({
        companyName: clients.companyName,
        contactName: clients.contactName,
        email: clients.email,
        address: clients.address,
      })
      .from(clients)
      .where(eq(clients.id, event.clientId))
      .then((rows) => rows[0]);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
    h1 { font-size: 28px; margin-bottom: 4px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .invoice-info { text-align: right; }
    .invoice-info p { margin: 2px 0; font-size: 14px; }
    .bill-to { margin-bottom: 30px; }
    .bill-to h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { text-align: left; border-bottom: 2px solid #333; padding: 8px 4px; font-size: 13px; color: #666; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
    td { padding: 8px 4px; border-bottom: 1px solid #eee; font-size: 14px; }
    td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; }
    .totals { width: 300px; margin-left: auto; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .totals .total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 8px; margin-top: 4px; }
    .notes { margin-top: 30px; font-size: 13px; color: #666; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <p style="font-size: 18px; color: #666;">${invoice.invoiceNumber}</p>
    </div>
    <div class="invoice-info">
      <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
      ${invoice.dueDate ? `<p><strong>Due:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
      <p><strong>Status:</strong> ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</p>
    </div>
  </div>

  ${
    client
      ? `
  <div class="bill-to">
    <h3>Bill To</h3>
    <p><strong>${client.companyName}</strong></p>
    <p>${client.contactName}</p>
    <p>${client.email}</p>
    ${client.address ? `<p>${client.address}</p>` : ''}
  </div>`
      : ''
  }

  ${event ? `<p style="font-size: 14px; color: #666; margin-bottom: 20px;"><strong>Event:</strong> ${event.eventName} — ${new Date(event.eventDate).toLocaleDateString()}</p>` : ''}

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems
        .map(
          (item) => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.amount)}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span>Subtotal</span>
      <span>${formatCurrency(invoice.subtotal)}</span>
    </div>
    ${
      parseFloat(invoice.taxRate ?? '0') > 0
        ? `
    <div class="row">
      <span>Tax (${(parseFloat(invoice.taxRate ?? '0') * 100).toFixed(2)}%)</span>
      <span>${formatCurrency(invoice.taxAmount)}</span>
    </div>`
        : ''
    }
    <div class="row total">
      <span>Total</span>
      <span>${formatCurrency(invoice.total)}</span>
    </div>
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.html"`,
    },
  });
}
