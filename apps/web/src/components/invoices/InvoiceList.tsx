'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

interface InvoiceListProps {
  eventId: number;
  isAdmin: boolean;
}

function formatCurrency(amount: string | null): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    parseFloat(amount || '0')
  );
}

export function InvoiceList({ eventId, isAdmin }: InvoiceListProps) {
  const { data: invoices, isLoading } = trpc.invoice.listByEvent.useQuery({ eventId });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Link
          href={`/events/${eventId}/invoices/new`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Create Invoice
        </Link>
      )}

      {!invoices || invoices.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No invoices yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-500">Invoice #</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500">Status</th>
                <th className="text-right py-2 px-2 font-medium text-gray-500">Total</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500">Due Date</th>
                <th className="text-right py-2 px-2 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-900 font-medium">{invoice.invoiceNumber}</td>
                  <td className="py-2 px-2">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="py-2 px-2 text-right text-gray-900 font-medium">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="py-2 px-2 text-gray-600">
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <Link
                      href={`/events/${eventId}/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
