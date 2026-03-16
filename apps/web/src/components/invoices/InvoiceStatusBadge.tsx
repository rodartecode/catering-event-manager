'use client';

interface InvoiceStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800 border-gray-200' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800 border-green-200' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
