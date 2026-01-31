'use client';

function ClientCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-40 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-48" />
        <div className="h-4 bg-gray-200 rounded w-36" />
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
        <div className="h-6 bg-gray-200 rounded w-16" />
        <div className="h-6 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}

export function ClientListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ClientCardSkeleton />
      <ClientCardSkeleton />
      <ClientCardSkeleton />
      <ClientCardSkeleton />
      <ClientCardSkeleton />
    </div>
  );
}
