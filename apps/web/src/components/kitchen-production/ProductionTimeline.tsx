'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';
import { ProductionTaskCard } from './ProductionTaskCard';
import { ProductionTaskForm } from './ProductionTaskForm';

interface ProductionTimelineProps {
  eventId: number;
}

type TimeBand = {
  label: string;
  minOffset: number;
  maxOffset: number;
};

const timeBands: TimeBand[] = [
  { label: 'Day before (24-12h)', minOffset: -1440, maxOffset: -720 },
  { label: 'Morning of (12-4h)', minOffset: -720, maxOffset: -240 },
  { label: 'Final prep (4-1h)', minOffset: -240, maxOffset: -60 },
  { label: 'Service (< 1h)', minOffset: -60, maxOffset: 0 },
];

export function ProductionTimeline({ eventId }: ProductionTimelineProps) {
  const { isAdmin } = useIsAdmin();
  const [showForm, setShowForm] = useState(false);

  const { data: timelineData, isLoading } = trpc.kitchenProduction.timeline.getByEvent.useQuery({
    eventId,
  });

  const utils = trpc.useUtils();

  const statusMutation = trpc.kitchenProduction.task.updateStatus.useMutation({
    onSuccess: () => {
      utils.kitchenProduction.timeline.getByEvent.invalidate({ eventId });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const autoGenerateMutation = trpc.kitchenProduction.autoGenerate.useMutation({
    onSuccess: (result) => {
      utils.kitchenProduction.timeline.getByEvent.invalidate({ eventId });
      toast.success(
        `Generated ${result.created} tasks from ${result.menuItemsProcessed} menu items`
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const recalculateMutation = trpc.kitchenProduction.timeline.recalculate.useMutation({
    onSuccess: (result) => {
      utils.kitchenProduction.timeline.getByEvent.invalidate({ eventId });
      toast.success(`Recalculated ${result.updated} tasks`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleStatusChange = (taskId: number, status: string) => {
    statusMutation.mutate({
      id: taskId,
      status: status as 'pending' | 'in_progress' | 'completed' | 'skipped',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-3" />
            <div className="space-y-3">
              <div className="h-24 bg-gray-100 rounded-lg" />
              <div className="h-24 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const tasks = timelineData ?? [];

  const groupedTasks = timeBands.map((band) => ({
    ...band,
    tasks: tasks.filter(
      (item) =>
        item.task.offsetMinutes >= band.minOffset && item.task.offsetMinutes > band.maxOffset
    ),
  }));

  // Tasks that don't fit any band (> 24h before or after event)
  const otherTasks = tasks.filter(
    (item) => item.task.offsetMinutes < -1440 || item.task.offsetMinutes >= 0
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (t) => t.task.status === 'completed' || t.task.status === 'skipped'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">
            {completedTasks}/{totalTasks} tasks completed
          </p>
          {totalTasks > 0 && (
            <div className="w-48 bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => recalculateMutation.mutate({ eventId })}
                disabled={recalculateMutation.isPending}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                {recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate Times'}
              </button>
              <button
                type="button"
                onClick={() => autoGenerateMutation.mutate({ eventId, clearExisting: false })}
                disabled={autoGenerateMutation.isPending}
                className="px-3 py-1.5 text-sm border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition disabled:opacity-50"
              >
                {autoGenerateMutation.isPending ? 'Generating...' : 'Auto-generate'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {showForm ? 'Cancel' : 'Add Task'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Add Production Task</h3>
          <ProductionTaskForm
            eventId={eventId}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Timeline Bands */}
      {totalTasks === 0 && !showForm ? (
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-500 text-lg">No production tasks yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Add tasks to build a production timeline for this event
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {otherTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Earlier prep (&gt; 24h before)
              </h3>
              <div className="space-y-3">
                {otherTasks
                  .filter((t) => t.task.offsetMinutes < -1440)
                  .map((item) => (
                    <ProductionTaskCard
                      key={item.task.id}
                      task={item.task}
                      stationName={item.stationName}
                      assignedToName={item.assignedToName}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
              </div>
            </div>
          )}

          {groupedTasks.map((band) => (
            <div key={band.label}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {band.label}
                {band.tasks.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    ({band.tasks.length} task{band.tasks.length !== 1 ? 's' : ''})
                  </span>
                )}
              </h3>
              {band.tasks.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No tasks in this window</p>
              ) : (
                <div className="space-y-3">
                  {band.tasks.map((item) => (
                    <ProductionTaskCard
                      key={item.task.id}
                      task={item.task}
                      stationName={item.stationName}
                      assignedToName={item.assignedToName}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
