'use client';

import { useState } from 'react';
import { ResourceAssignmentDialog } from '@/components/resources/ResourceAssignmentDialog';
import { trpc } from '@/lib/trpc';
import { TaskAssignDialog } from './TaskAssignDialog';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { TaskListSkeleton } from './TaskListSkeleton';

interface TaskListProps {
  eventId: number;
  isAdmin?: boolean;
}

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';
type CategoryFilter = 'all' | 'pre_event' | 'during_event' | 'post_event';

interface TaskItem {
  id: number;
  eventId: number;
  title: string;
  description: string | null;
  category: 'pre_event' | 'during_event' | 'post_event';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: Date | null;
  dependsOnTaskId: number | null;
  isOverdue: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: number | null;
  assignee: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export function TaskList({ eventId, isAdmin = false }: TaskListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [assigningTask, setAssigningTask] = useState<number | null>(null);
  const [resourceTask, setResourceTask] = useState<{
    id: number;
    eventId: number;
    startTime: Date;
    endTime: Date;
  } | null>(null);

  const { data, isLoading, error } = trpc.task.listByEvent.useQuery({
    eventId,
    status: statusFilter,
    category: categoryFilter,
    overdueOnly,
  });

  const utils = trpc.useUtils();

  const handleFormSuccess = () => {
    setIsCreateOpen(false);
    setEditingTask(null);
    utils.task.listByEvent.invalidate({ eventId });
    utils.event.getById.invalidate({ id: eventId });
  };

  const handleAssignSuccess = () => {
    setAssigningTask(null);
    utils.task.listByEvent.invalidate({ eventId });
  };

  const handleResourceSuccess = () => {
    setResourceTask(null);
    utils.task.listByEvent.invalidate({ eventId });
  };

  const openResourceDialog = (task: TaskItem) => {
    // Default to task due date or today + 1 day for timing
    const startTime = task.dueDate ? new Date(task.dueDate) : new Date();
    startTime.setHours(9, 0, 0, 0); // Default 9 AM
    const endTime = new Date(startTime);
    endTime.setHours(17, 0, 0, 0); // Default 5 PM

    setResourceTask({
      id: task.id,
      eventId: task.eventId,
      startTime,
      endTime,
    });
  };

  // Group tasks by category
  const groupedTasks = data?.items.reduce<Record<string, TaskItem[]>>(
    (acc: Record<string, TaskItem[]>, task: TaskItem) => {
      if (!acc[task.category]) {
        acc[task.category] = [];
      }
      acc[task.category].push(task);
      return acc;
    },
    {}
  );

  const categoryOrder = ['pre_event', 'during_event', 'post_event'] as const;
  const categoryLabels = {
    pre_event: 'Pre-Event Tasks',
    during_event: 'During Event Tasks',
    post_event: 'Post-Event Tasks',
  };

  if (isLoading) {
    return <TaskListSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading tasks: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="pre_event">Pre-Event</option>
            <option value="during_event">During Event</option>
            <option value="post_event">Post-Event</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Overdue only
          </label>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Task
          </button>
        )}
      </div>

      {/* Tasks List */}
      {!data?.items.length ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-gray-600 mb-4">No tasks found</p>
          {isAdmin && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create First Task
            </button>
          )}
        </div>
      ) : categoryFilter === 'all' ? (
        // Show grouped by category when not filtering
        <div className="space-y-8">
          {categoryOrder.map((category) => {
            const categoryTasks = groupedTasks?.[category];
            if (!categoryTasks?.length) return null;

            return (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {categoryLabels[category]}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({categoryTasks.length})
                  </span>
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryTasks.map((task: TaskItem) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isAdmin={isAdmin}
                      onEdit={() => setEditingTask(task.id)}
                      onAssign={() => setAssigningTask(task.id)}
                      onResources={() => openResourceDialog(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Simple grid when filtering by category
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((task: TaskItem) => (
            <TaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              onEdit={() => setEditingTask(task.id)}
              onAssign={() => setAssigningTask(task.id)}
              onResources={() => openResourceDialog(task)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {(isCreateOpen || editingTask !== null) && (
        <TaskForm
          eventId={eventId}
          taskId={editingTask ?? undefined}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingTask(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Assign Dialog */}
      {assigningTask !== null && (
        <TaskAssignDialog
          taskId={assigningTask}
          onClose={() => setAssigningTask(null)}
          onSuccess={handleAssignSuccess}
        />
      )}

      {/* Resource Assignment Dialog */}
      {resourceTask !== null && (
        <ResourceAssignmentDialog
          isOpen={true}
          onClose={() => setResourceTask(null)}
          taskId={resourceTask.id}
          eventId={resourceTask.eventId}
          startTime={resourceTask.startTime}
          endTime={resourceTask.endTime}
          onSuccess={handleResourceSuccess}
        />
      )}
    </div>
  );
}
