'use client';

import { trpc } from '@/lib/trpc';

interface PaymentListProps {
  invoiceId: number;
  isAdmin: boolean;
}

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  credit_card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export function PaymentList({ invoiceId, isAdmin }: PaymentListProps) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.payment.listByInvoice.useQuery({ invoiceId });

  const deleteMutation = trpc.payment.delete.useMutation({
    onSuccess: () => {
      utils.payment.listByInvoice.invalidate({ invoiceId });
      utils.invoice.getById.invalidate({ id: invoiceId });
    },
  });

  if (isLoading) {
    return <div className="animate-pulse h-20 bg-gray-200 rounded"></div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Payment Summary Bar */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Paid</span>
          <span className="font-medium">{formatCurrency(data.totalPaid)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{
              width: `${data.invoiceTotal > 0 ? Math.min((data.totalPaid / data.invoiceTotal) * 100, 100) : 0}%`,
            }}
          ></div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Remaining</span>
          <span
            className={`font-medium ${data.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            {formatCurrency(data.remainingBalance)}
          </span>
        </div>
      </div>

      {/* Payment History */}
      {data.payments.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-500">Date</th>
              <th className="text-left py-2 font-medium text-gray-500">Method</th>
              <th className="text-left py-2 font-medium text-gray-500">Reference</th>
              <th className="text-right py-2 font-medium text-gray-500">Amount</th>
              {isAdmin && <th className="text-right py-2 font-medium text-gray-500"></th>}
            </tr>
          </thead>
          <tbody>
            {data.payments.map((payment) => (
              <tr key={payment.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-600">
                  {new Date(payment.paymentDate).toLocaleDateString()}
                </td>
                <td className="py-2 text-gray-900">
                  {methodLabels[payment.method] || payment.method}
                </td>
                <td className="py-2 text-gray-600">{payment.reference || '-'}</td>
                <td className="py-2 text-right text-gray-900 font-medium">
                  {formatCurrency(payment.amount)}
                </td>
                {isAdmin && (
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this payment?')) {
                          deleteMutation.mutate({ id: payment.id });
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
