'use client';

import Link from 'next/link';
import { Suspense, use } from 'react';
import { StationTypeBadge } from '@/components/kitchen-production/StationTypeBadge';
import { trpc } from '@/lib/trpc';

function StationDetailContent({ id }: { id: number }) {
  const { data: station, isLoading } = trpc.kitchenProduction.station.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse max-w-2xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 text-lg">Station not found</p>
        <Link
          href="/kitchen-production"
          className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
        >
          Back to stations
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/kitchen-production" className="text-gray-500 hover:text-gray-700">
            <svg
              aria-hidden="true"
              className="w-5 h-5"
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
            <span className="sr-only">Back to stations</span>
          </Link>
          <h1 className="text-3xl font-bold">{station.name}</h1>
          <StationTypeBadge type={station.type} />
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-medium capitalize">{station.type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Concurrent Capacity</p>
              <p className="font-medium">
                {station.capacity} task{station.capacity !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {station.notes && (
            <div>
              <p className="text-sm text-gray-500">Notes</p>
              <p className="text-gray-700">{station.notes}</p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Created: {new Date(station.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <StationDetailContent id={parseInt(id, 10)} />
    </Suspense>
  );
}
