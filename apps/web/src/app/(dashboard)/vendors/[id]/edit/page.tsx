'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { VendorServiceType } from '@/components/vendors/service-types';
import { VendorForm } from '@/components/vendors/VendorForm';
import { trpc } from '@/lib/trpc';

export default function EditVendorPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = Number(params.id);

  const { data: vendor, isLoading } = trpc.vendor.getById.useQuery({ id: vendorId });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">Vendor not found</p>
          <Link href="/vendors" className="inline-block mt-4 text-blue-600 hover:text-blue-700">
            Back to vendors
          </Link>
        </div>
      </div>
    );
  }

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
          Back
        </button>

        <h1 className="text-3xl font-bold">Edit {vendor.companyName}</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <VendorForm
          initialData={{
            id: vendor.id,
            companyName: vendor.companyName,
            contactName: vendor.contactName,
            email: vendor.email,
            phone: vendor.phone,
            serviceType: vendor.serviceType as VendorServiceType,
            notes: vendor.notes,
            isActive: vendor.isActive,
          }}
          onSuccess={(updated) => {
            router.push(`/vendors/${updated.id}`);
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
