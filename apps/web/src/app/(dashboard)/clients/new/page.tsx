'use client';

import { useRouter } from 'next/navigation';
import { ClientForm } from '@/components/clients/ClientForm';

export default function NewClientPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Clients
        </button>

        <h1 className="text-3xl font-bold">Add New Client</h1>
        <p className="text-gray-600 mt-2">
          Create a new client record with their contact information.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <ClientForm
          onSuccess={(client) => {
            router.push(`/clients/${client.id}`);
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
