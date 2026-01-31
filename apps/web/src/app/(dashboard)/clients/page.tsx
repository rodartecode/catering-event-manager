'use client';

import { useState, Suspense } from 'react';
import { trpc } from '@/lib/trpc';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientListSkeleton } from '@/components/clients/ClientListSkeleton';
import { FollowUpBanner } from '@/components/clients/FollowUpBanner';
import { useIsAdmin } from '@/lib/use-auth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ClientsPageContent() {
  const { isAdmin } = useIsAdmin();
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const showFollowUps = searchParams.get('followups') === 'due';

  const { data: clients, isLoading } = trpc.clients.list.useQuery();
  const { data: dueFollowUps } = trpc.clients.getDueFollowUps.useQuery();

  const filteredClients = clients?.filter((client) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      client.companyName.toLowerCase().includes(searchLower) ||
      client.contactName.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower);

    if (showFollowUps && dueFollowUps) {
      const hasFollowUp = dueFollowUps.followUps.some(
        (f) => f.client.id === client.id
      );
      return matchesSearch && hasFollowUp;
    }

    return matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clients</h1>
        {isAdmin && (
          <Link
            href="/clients/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Client
          </Link>
        )}
      </div>

      <FollowUpBanner />

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              Search clients
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
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
                placeholder="Search by company, contact, or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {showFollowUps && (
            <Link
              href="/clients"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-center"
            >
              Show All Clients
            </Link>
          )}
        </div>
      </div>

      {/* Client List */}
      {isLoading ? (
        <ClientListSkeleton />
      ) : filteredClients?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {search ? (
            <p className="text-gray-500 text-lg">No clients match your search</p>
          ) : showFollowUps ? (
            <p className="text-gray-500 text-lg">No clients with pending follow-ups</p>
          ) : (
            <>
              <p className="text-gray-500 text-lg">No clients yet</p>
              <Link
                href="/clients/new"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700"
              >
                Add your first client
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients?.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <ClientsPageContent />
    </Suspense>
  );
}
