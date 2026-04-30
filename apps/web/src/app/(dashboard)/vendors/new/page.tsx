'use client';

import { useRouter } from 'next/navigation';
import { VendorForm } from '@/components/vendors/VendorForm';

export default function NewVendorPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          <svg
            aria-hidden="true"
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Vendors
        </button>

        <h1 className="text-3xl font-bold">Add New Vendor</h1>
        <p className="text-gray-600 mt-2">
          Add a vendor to your subcontractor directory for event assignments.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <VendorForm
          onSuccess={(vendor) => {
            router.push(`/vendors/${vendor.id}`);
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
