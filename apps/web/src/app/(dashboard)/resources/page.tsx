'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { useIsAdmin } from '@/lib/use-auth';
import Link from 'next/link';

type ResourceType = 'staff' | 'equipment' | 'materials' | 'all';
type AvailabilityFilter = 'all' | 'available' | 'unavailable';

export default function ResourcesPage() {
  const { isAdmin } = useIsAdmin();
  const [type, setType] = useState<ResourceType>('all');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.resource.list.useInfiniteQuery(
      {
        type: type === 'all' ? undefined : type,
        isAvailable: availability === 'all' ? undefined : availability === 'available',
        limit: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const resources = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Resources</h1>
        {isAdmin && (
          <Link
            href="/resources/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Resource
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Resource Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as ResourceType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="staff">Staff</option>
              <option value="equipment">Equipment</option>
              <option value="materials">Materials</option>
            </select>
          </div>

          {/* Availability */}
          <div>
            <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
              Availability
            </label>
            <select
              id="availability"
              value={availability}
              onChange={(e) => setAvailability(e.target.value as AvailabilityFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setType('all');
                setAvailability('all');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Resource Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">{resources.length}</div>
          <div className="text-sm text-gray-500">Total Shown</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">
            {resources.filter((r) => r.type === 'staff').length}
          </div>
          <div className="text-sm text-purple-600">Staff</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">
            {resources.filter((r) => r.type === 'equipment').length}
          </div>
          <div className="text-sm text-blue-600">Equipment</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {resources.filter((r) => r.type === 'materials').length}
          </div>
          <div className="text-sm text-green-600">Materials</div>
        </div>
      </div>

      {/* Resource List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="text-gray-500 text-lg">No resources found</p>
          <Link
            href="/resources/new"
            className="inline-block mt-4 text-blue-600 hover:text-blue-700"
          >
            Add your first resource
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>

          {/* Load More */}
          {hasNextPage && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
