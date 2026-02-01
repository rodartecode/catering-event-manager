'use client';

import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskCategoryBadge } from './TaskCategoryBadge';
import { TaskStatusButton } from './TaskStatusButton';
import { OverdueIndicator } from './OverdueIndicator';

interface TaskCardProps {
  task: {
    id: number;
    title: string;
    description: string | null;
    category: 'pre_event' | 'during_event' | 'post_event';
    status: 'pending' | 'in_progress' | 'completed';
    dueDate: Date | null;
    isOverdue: boolean;
    dependsOnTaskId: number | null;
    assignee: {
      id: number;
      name: string;
      email: string;
    } | null;
    resourceCount?: number;
  };
  onEdit?: () => void;
  onAssign?: () => void;
  onResources?: () => void;
  showActions?: boolean;
  isAdmin?: boolean;
}

export function TaskCard({ task, onEdit, onAssign, onResources, showActions = true, isAdmin = false }: TaskCardProps) {
  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div data-testid="task-card" className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{task.title}</h4>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 ml-4">
          <TaskStatusBadge status={task.status} />
          <TaskCategoryBadge category={task.category} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-gray-500">
        {formattedDueDate && (
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-1"
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
            {formattedDueDate}
          </span>
        )}

        {task.assignee && (
          <span className="flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {task.assignee.name}
          </span>
        )}

        {task.dependsOnTaskId && (
          <span className="flex items-center text-amber-600">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Has dependency
          </span>
        )}

        <OverdueIndicator isOverdue={task.isOverdue} dueDate={task.dueDate} />

        {task.resourceCount !== undefined && task.resourceCount > 0 && (
          <span className="flex items-center text-blue-600">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            {task.resourceCount} resource{task.resourceCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {showActions && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <TaskStatusButton taskId={task.id} currentStatus={task.status} />

          {isAdmin && (
            <div className="flex gap-2">
              {onResources && (
                <button
                  onClick={onResources}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition"
                >
                  Resources
                </button>
              )}
              {onAssign && (
                <button
                  onClick={onAssign}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition"
                >
                  Assign
                </button>
              )}
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
