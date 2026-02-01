'use client';

function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse" aria-hidden="true">
      <div className="flex justify-between items-start mb-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-6 bg-gray-200 rounded w-20" />
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-40" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-36" />
      </div>
    </div>
  );
}

export function EventListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      aria-busy="true"
      aria-label="Loading events"
    >
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </div>
  );
}
