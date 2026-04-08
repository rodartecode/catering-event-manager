'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { StationCard } from '@/components/kitchen-production/StationCard';
import { StationListSkeleton } from '@/components/kitchen-production/StationListSkeleton';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';

function KitchenStationsContent() {
  const { isAdmin } = useIsAdmin();
  const [search, setSearch] = useState('');

  const { data: stations, isLoading } = trpc.kitchenProduction.station.list.useQuery();

  const filteredStations = stations?.filter((station) =>
    station.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kitchen Stations</h1>
        {isAdmin && (
          <Link
            href="/kitchen-production/stations/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Station
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search stations
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
              placeholder="Search by station name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Station List */}
      {isLoading ? (
        <StationListSkeleton />
      ) : filteredStations?.length === 0 ? (
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
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          {search ? (
            <p className="text-gray-500 text-lg">No stations match your search</p>
          ) : (
            <>
              <p className="text-gray-500 text-lg">No kitchen stations yet</p>
              <Link
                href="/kitchen-production/stations/new"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700"
              >
                Add your first station
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStations?.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KitchenProductionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <KitchenStationsContent />
    </Suspense>
  );
}
