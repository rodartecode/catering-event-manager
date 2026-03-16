'use client';

import { useParams, useRouter } from 'next/navigation';
import { InvoiceDetail } from '@/components/invoices';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params.id);
  const invoiceId = Number(params.invoiceId);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        onClick={() => router.push(`/events/${eventId}`)}
        className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Event
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <InvoiceDetail invoiceId={invoiceId} eventId={eventId} />
      </div>
    </div>
  );
}
