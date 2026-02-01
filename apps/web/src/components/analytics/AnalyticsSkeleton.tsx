'use client';

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse" aria-hidden="true">
      <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-32" />
    </div>
  );
}

export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 animate-pulse ${height}`}
      aria-hidden="true"
    >
      <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
      <div className="flex items-end justify-around h-full gap-2 pb-8">
        <div className="bg-gray-200 rounded w-12" style={{ height: '40%' }} />
        <div className="bg-gray-200 rounded w-12" style={{ height: '65%' }} />
        <div className="bg-gray-200 rounded w-12" style={{ height: '85%' }} />
        <div className="bg-gray-200 rounded w-12" style={{ height: '45%' }} />
        <div className="bg-gray-200 rounded w-12" style={{ height: '70%' }} />
        <div className="bg-gray-200 rounded w-12" style={{ height: '55%' }} />
      </div>
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      {/* Header skeleton */}
      <div className="animate-pulse" aria-hidden="true">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-96" />
      </div>

      {/* Date picker skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse" aria-hidden="true">
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-24" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height="h-80" />
        <ChartSkeleton height="h-80" />
      </div>
      <ChartSkeleton height="h-80" />
    </div>
  );
}
