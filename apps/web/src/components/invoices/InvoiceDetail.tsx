'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PaymentList, RecordPaymentDialog } from '@/components/payments';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

interface InvoiceDetailProps {
  invoiceId: number;
  eventId: number;
}

function formatCurrency(amount: string | null): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    parseFloat(amount || '0')
  );
}

export function InvoiceDetail({ invoiceId, eventId }: InvoiceDetailProps) {
  const router = useRouter();
  const { isAdmin } = useIsAdmin();
  const utils = trpc.useUtils();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: invoice, isLoading, error } = trpc.invoice.getById.useQuery({ id: invoiceId });

  const statusMutation = trpc.invoice.updateStatus.useMutation({
    onSuccess: () => {
      utils.invoice.getById.invalidate({ id: invoiceId });
      utils.invoice.listByEvent.invalidate({ eventId });
    },
  });

  const deleteMutation = trpc.invoice.delete.useMutation({
    onSuccess: () => {
      router.push(`/events/${eventId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-40 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Invoice not found</p>
      </div>
    );
  }

  const statusActions: Record<string, { label: string; newStatus: string; className: string }[]> = {
    draft: [
      {
        label: 'Send Invoice',
        newStatus: 'sent',
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
      },
      {
        label: 'Cancel',
        newStatus: 'cancelled',
        className: 'border border-gray-300 hover:bg-gray-50',
      },
    ],
    sent: [
      {
        label: 'Mark Paid',
        newStatus: 'paid',
        className: 'bg-green-600 hover:bg-green-700 text-white',
      },
      {
        label: 'Mark Overdue',
        newStatus: 'overdue',
        className: 'bg-red-600 hover:bg-red-700 text-white',
      },
      {
        label: 'Cancel',
        newStatus: 'cancelled',
        className: 'border border-gray-300 hover:bg-gray-50',
      },
    ],
    overdue: [
      {
        label: 'Mark Paid',
        newStatus: 'paid',
        className: 'bg-green-600 hover:bg-green-700 text-white',
      },
      {
        label: 'Cancel',
        newStatus: 'cancelled',
        className: 'border border-gray-300 hover:bg-gray-50',
      },
    ],
    paid: [
      {
        label: 'Cancel',
        newStatus: 'cancelled',
        className: 'border border-gray-300 hover:bg-gray-50',
      },
    ],
  };

  const actions = statusActions[invoice.status] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{invoice.invoiceNumber}</h2>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            {actions.map((action) => (
              <button
                key={action.newStatus}
                type="button"
                onClick={() =>
                  statusMutation.mutate({
                    id: invoiceId,
                    newStatus: action.newStatus as
                      | 'draft'
                      | 'sent'
                      | 'paid'
                      | 'overdue'
                      | 'cancelled',
                  })
                }
                disabled={statusMutation.isPending}
                className={`px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-50 ${action.className}`}
              >
                {action.label}
              </button>
            ))}

            {invoice.status === 'draft' && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this draft invoice?')) {
                    deleteMutation.mutate({ id: invoiceId });
                  }
                }}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-red-600 border border-red-300 rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-50"
              >
                Delete
              </button>
            )}

            <a
              href={`/api/invoices/${invoiceId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Download PDF
            </a>
          </div>
        )}
      </div>

      {/* Client & Event Info */}
      {(invoice.client || invoice.event) && (
        <div className="grid grid-cols-2 gap-6">
          {invoice.client && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Bill To</h3>
              <p className="text-gray-900 font-medium">{invoice.client.companyName}</p>
              <p className="text-gray-600 text-sm">{invoice.client.contactName}</p>
              <p className="text-gray-600 text-sm">{invoice.client.email}</p>
              {invoice.client.address && (
                <p className="text-gray-600 text-sm">{invoice.client.address}</p>
              )}
            </div>
          )}
          <div>
            {invoice.event && (
              <>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Event</h3>
                <p className="text-gray-900">{invoice.event.eventName}</p>
                <p className="text-gray-600 text-sm">
                  {new Date(invoice.event.eventDate).toLocaleDateString()}
                </p>
              </>
            )}
            {invoice.dueDate && (
              <div className="mt-2">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Due Date</h3>
                <p className="text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Line Items */}
      <div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 font-medium text-gray-500">Description</th>
              <th className="text-right py-2 font-medium text-gray-500">Qty</th>
              <th className="text-right py-2 font-medium text-gray-500">Unit Price</th>
              <th className="text-right py-2 font-medium text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">{item.description}</td>
                <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                <td className="py-2 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2 text-right text-gray-900 font-medium">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        {parseFloat(invoice.taxRate ?? '0') > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Tax ({(parseFloat(invoice.taxRate ?? '0') * 100).toFixed(2)}%)
            </span>
            <span>{formatCurrency(invoice.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
          <span>Total</span>
          <span>{formatCurrency(invoice.total)}</span>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
          <p className="text-gray-700 text-sm">{invoice.notes}</p>
        </div>
      )}

      {/* Payments Section */}
      {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'paid') && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Payments</h3>
            {isAdmin && invoice.status !== 'paid' && (
              <button
                type="button"
                onClick={() => setIsPaymentDialogOpen(true)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
              >
                Record Payment
              </button>
            )}
          </div>
          <PaymentList invoiceId={invoiceId} isAdmin={isAdmin} />
        </div>
      )}

      {/* Record Payment Dialog */}
      {isPaymentDialogOpen && (
        <RecordPaymentDialog invoiceId={invoiceId} onClose={() => setIsPaymentDialogOpen(false)} />
      )}
    </div>
  );
}
