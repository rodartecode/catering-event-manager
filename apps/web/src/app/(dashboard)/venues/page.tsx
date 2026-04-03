'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { VenueCard } from '@/components/venues/VenueCard';
import { VenueListSkeleton } from '@/components/venues/VenueListSkeleton';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';

function VenuesPageContent() {
  const { isAdmin } = useIsAdmin();
  const [search, setSearch] = useState('');

  const { data: venues, isLoading } = trpc.venue.list.useQuery();

  const filteredVenues = venues?.filter((venue) => {
    const searchLower = search.toLowerCase();
    return (
      venue.name.toLowerCase().includes(searchLower) ||
      venue.address.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Venues</h1>
        {isAdmin && (
          <Link
            href="/venues/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Venue
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search venues
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or address..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Venue List */}
      {isLoading ? (
        <VenueListSkeleton />
      ) : filteredVenues?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            aria-hidden="true"
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          {search ? (
            <p className="text-gray-500 text-lg">No venues match your search</p>
          ) : (
            <>
              <p className="text-gray-500 text-lg">No venues yet</p>
              <Link
                href="/venues/new"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700"
              >
                Add your first venue
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues?.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VenuesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <VenuesPageContent />
    </Suspense>
  );
}
