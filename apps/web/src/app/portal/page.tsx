'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

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
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function PortalEventCard({ event }: { event: {
  id: number;
  eventName: string;
  eventDate: Date | null;
  status: string;
  location: string | null;
  estimatedAttendees: number | null;
} }) {
  return (
    <Link
      href={`/portal/events/${event.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{event.eventName}</h3>
        <EventStatusBadge status={event.status} />
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {event.eventDate
              ? new Date(event.eventDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Date TBD'}
          </span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.location}</span>
          </div>
        )}
        {event.estimatedAttendees && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.estimatedAttendees} guests</span>
          </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <span className="text-blue-600 text-sm font-medium flex items-center gap-1">
          View Details
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default function PortalDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data: summary, isLoading, error } = trpc.portal.getSummary.useQuery(undefined, {
    enabled: status === 'authenticated',
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/portal/login');
    }
  }, [status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">Unable to load your dashboard. Please try again later.</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{summary?.client?.contactName ? `, ${summary.client.contactName}` : ''}!
        </h1>
        {summary?.client?.companyName && (
          <p className="text-gray-600 mt-1">{summary.client.companyName}</p>
        )}
      </div>

      {/* Events Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Your Events
            {summary?.activeEventsCount !== undefined && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({summary.activeEventsCount} active)
              </span>
            )}
          </h2>
          {summary?.events && summary.events.length > 0 && (
            <Link
              href="/portal/events"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </Link>
          )}
        </div>

        {summary?.events && summary.events.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summary.events.slice(0, 6).map((event) => (
              <PortalEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Yet</h3>
            <p className="text-gray-500">
              You don&apos;t have any active events. Contact us to plan your next event!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
