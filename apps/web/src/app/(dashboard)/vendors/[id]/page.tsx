'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  type VendorServiceType,
  vendorServiceTypeBadgeClasses,
  vendorServiceTypeLabels,
} from '@/components/vendors/service-types';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';

type Tab = 'info' | 'events';

function formatCost(cost: string | null): string {
  if (!cost) return '—';
  const num = parseFloat(cost);
  if (Number.isNaN(num)) return cost;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = Number(params.id);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const { isAdmin } = useIsAdmin();

  const { data: vendor, isLoading } = trpc.vendor.getById.useQuery({ id: vendorId });
  const { data: assignments } = trpc.vendor.listAssignmentsForVendor.useQuery({ vendorId });

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

  const serviceType = vendor.serviceType as VendorServiceType;
  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Details' },
    { id: 'events', label: 'Events' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/vendors"
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center w-fit"
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
        </Link>

        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{vendor.companyName}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${vendorServiceTypeBadgeClasses[serviceType]}`}
              >
                {vendorServiceTypeLabels[serviceType]}
              </span>
              {!vendor.isActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Inactive
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <Link
              href={`/vendors/${vendor.id}/edit`}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="-mb-px flex space-x-8" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'info' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Contact Name</dt>
              <dd className="text-sm font-medium">{vendor.contactName || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm">{vendor.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-sm">{vendor.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Assigned Events</dt>
              <dd className="text-sm font-medium">{vendor.assignedEventCount}</dd>
            </div>
            {vendor.notes && (
              <div>
                <dt className="text-sm text-gray-500">Notes</dt>
                <dd className="text-sm whitespace-pre-wrap">{vendor.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Event Assignments</h2>
          {!assignments || assignments.length === 0 ? (
            <p className="text-gray-500 text-sm">No event assignments yet</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="py-3">
                  <Link
                    href={`/events/${assignment.eventId}`}
                    className="flex justify-between items-start hover:bg-gray-50 -mx-3 px-3 py-2 rounded transition"
                  >
                    <div>
                      <p className="font-medium">{assignment.eventName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(assignment.eventDate).toLocaleDateString()}
                        {assignment.role && ` — ${assignment.role}`}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {formatCost(assignment.cost)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
