'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

type EventStatus =
  | 'inquiry'
  | 'planning'
  | 'preparation'
  | 'in_progress'
  | 'completed'
  | 'follow_up';

function EventStatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    inquiry: 'bg-purple-100 text-purple-800',
    planning: 'bg-blue-100 text-blue-800',
    preparation: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    follow_up: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    inquiry: 'Inquiry',
    planning: 'Planning',
    preparation: 'Preparation',
    in_progress: 'In Progress',
    completed: 'Completed',
    follow_up: 'Follow Up',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

const STATUS_OPTIONS: { value: EventStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'planning', label: 'Planning' },
  { value: 'preparation', label: 'Preparation' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'follow_up', label: 'Follow Up' },
];

export default function PortalEventsPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');

  const { data, isLoading, error } = trpc.portal.listEvents.useQuery(
    statusFilter === 'all' ? undefined : { status: statusFilter },
    { enabled: authStatus === 'authenticated' }
  );

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/portal/login');
    }
  }, [authStatus, router]);

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">Unable to load events. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/portal"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mb-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Your Events</h1>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm text-gray-600">
            Filter:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      {data?.events && data.events.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guests
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.eventName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.eventDate
                      ? new Date(event.eventDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'TBD'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <EventStatusBadge status={event.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.location || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {event.estimatedAttendees || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/portal/events/${event.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
          <p className="text-gray-500">
            {statusFilter !== 'all'
              ? `You don't have any events with status "${STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}".`
              : "You don't have any events yet."}
          </p>
        </div>
      )}

      {/* Pagination info */}
      {data?.total !== undefined && data.total > 0 && (
        <p className="text-sm text-gray-500 text-center">
          Showing {data.events.length} of {data.total} events
        </p>
      )}
    </div>
  );
}
