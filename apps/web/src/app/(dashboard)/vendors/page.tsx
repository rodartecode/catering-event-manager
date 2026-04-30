'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import {
  type VendorServiceType,
  vendorServiceTypeLabels,
  vendorServiceTypes,
} from '@/components/vendors/service-types';
import { VendorCard } from '@/components/vendors/VendorCard';
import { VendorListSkeleton } from '@/components/vendors/VendorListSkeleton';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';

function VendorsPageContent() {
  const { isAdmin } = useIsAdmin();
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<VendorServiceType | ''>('');

  const { data: vendors, isLoading } = trpc.vendor.list.useQuery({
    serviceType: serviceTypeFilter || undefined,
  });

  const filtered = vendors?.filter((vendor) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      vendor.companyName.toLowerCase().includes(q) ||
      (vendor.contactName?.toLowerCase().includes(q) ?? false) ||
      (vendor.email?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vendors</h1>
        {isAdmin && (
          <Link
            href="/vendors/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Vendor
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search vendors
          </label>
          <input
            id="search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, contact, or email..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="md:w-56">
          <label htmlFor="serviceType" className="sr-only">
            Filter by service type
          </label>
          <select
            id="serviceType"
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value as VendorServiceType | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All service types</option>
            {vendorServiceTypes.map((type) => (
              <option key={type} value={type}>
                {vendorServiceTypeLabels[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <VendorListSkeleton />
      ) : filtered?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          {search || serviceTypeFilter ? (
            <p className="text-gray-500 text-lg">No vendors match your filters</p>
          ) : (
            <>
              <p className="text-gray-500 text-lg">No vendors yet</p>
              {isAdmin && (
                <Link
                  href="/vendors/new"
                  className="inline-block mt-4 text-blue-600 hover:text-blue-700"
                >
                  Add your first vendor
                </Link>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered?.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={{
                id: vendor.id,
                companyName: vendor.companyName,
                contactName: vendor.contactName,
                email: vendor.email,
                phone: vendor.phone,
                serviceType: vendor.serviceType as VendorServiceType,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VendorsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <VendorsPageContent />
    </Suspense>
  );
}
