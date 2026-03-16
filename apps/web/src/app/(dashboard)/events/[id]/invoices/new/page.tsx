'use client';

import { useParams } from 'next/navigation';
import { InvoiceForm } from '@/components/invoices';

export default function NewInvoicePage() {
  const params = useParams();
  const eventId = Number(params.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Create Invoice</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <InvoiceForm eventId={eventId} />
      </div>
    </div>
  );
}
