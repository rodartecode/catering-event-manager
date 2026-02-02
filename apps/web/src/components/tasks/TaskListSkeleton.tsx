'use client';

function TaskCardSkeleton() {
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 bg-gray-200 rounded w-40" />
        <div className="h-5 bg-gray-200 rounded w-20" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="flex items-center gap-2">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading tasks"
    >
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  );
}
