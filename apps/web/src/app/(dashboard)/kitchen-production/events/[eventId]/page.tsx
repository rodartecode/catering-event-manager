'use client';

import Link from 'next/link';
import { Suspense, use } from 'react';
import { ProductionTimeline } from '@/components/kitchen-production/ProductionTimeline';
import { trpc } from '@/lib/trpc';

function EventProductionContent({ eventId }: { eventId: number }) {
  const { data: event, isLoading } = trpc.event.getById.useQuery({ id: eventId });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-48 mb-8" />
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 text-lg">Event not found</p>
        <Link href="/events" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-2">
        <Link href={`/events/${eventId}`} className="text-gray-500 hover:text-gray-700">
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
          <span className="sr-only">Back to event</span>
        </Link>
        <h1 className="text-3xl font-bold">Production Timeline</h1>
      </div>
      <p className="text-gray-500 mb-8">
        {event.eventName} &mdash;{' '}
        {new Date(event.eventDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      <ProductionTimeline eventId={eventId} />
    </div>
  );
}

export default function EventProductionPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <EventProductionContent eventId={parseInt(eventId, 10)} />
    </Suspense>
  );
}
