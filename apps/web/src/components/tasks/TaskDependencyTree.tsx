'use client';

import { TaskStatusBadge } from './TaskStatusBadge';

interface Task {
  id: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface TaskDependencyTreeProps {
  dependency: Task | null;
  dependentTasks: Task[];
  currentTaskTitle: string;
}

export function TaskDependencyTree({
  dependency,
  dependentTasks,
  currentTaskTitle,
}: TaskDependencyTreeProps) {
  const hasAnyDependency = dependency || dependentTasks.length > 0;

  if (!hasAnyDependency) {
    return <p className="text-sm text-gray-500">This task has no dependencies.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Dependency (task this one depends on) */}
      {dependency && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Depends On</h4>
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{dependency.title}</p>
              {dependency.status !== 'completed' && (
                <p className="text-xs text-amber-700 mt-0.5">
                  Must be completed before this task can progress
                </p>
              )}
            </div>
            <TaskStatusBadge status={dependency.status} />
          </div>
        </div>
      )}

      {/* Visual dependency chain */}
      <div className="flex items-center justify-center py-2">
        <div className="flex flex-col items-center">
          {dependency && (
            <>
              <div className="px-3 py-1 bg-gray-100 rounded text-sm text-gray-600">
                {dependency.title}
              </div>
              <svg
                className="w-4 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </>
          )}
          <div className="px-3 py-1 bg-blue-100 border border-blue-200 rounded text-sm font-medium text-blue-800">
            {currentTaskTitle}
          </div>
          {dependentTasks.length > 0 && (
            <>
              <svg
                className="w-4 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <div className="flex gap-2 flex-wrap justify-center">
                {dependentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-3 py-1 bg-gray-100 rounded text-sm text-gray-600"
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dependent tasks (tasks that depend on this one) */}
      {dependentTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Blocking ({dependentTasks.length} task{dependentTasks.length > 1 ? 's' : ''})
          </h4>
          <div className="space-y-2">
            {dependentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <p className="flex-1 font-medium text-gray-900">{task.title}</p>
                <TaskStatusBadge status={task.status} />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            These tasks are waiting for this task to be completed.
          </p>
        </div>
      )}
    </div>
  );
}
