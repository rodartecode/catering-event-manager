'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';

interface TaskFormProps {
  eventId: number;
  taskId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface DependencyTask {
  id: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  category: 'pre_event' | 'during_event' | 'post_event';
}

type TaskCategory = 'pre_event' | 'during_event' | 'post_event';

export function TaskForm({ eventId, taskId, onClose, onSuccess }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('pre_event');
  const [dueDate, setDueDate] = useState('');
  const [dependsOnTaskId, setDependsOnTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = taskId !== undefined;

  // Fetch task data if editing
  const { data: taskData } = trpc.task.getById.useQuery(
    { id: taskId! },
    { enabled: isEditing }
  );

  // Fetch available dependencies
  const { data: availableDeps } = trpc.task.getAvailableDependencies.useQuery({
    eventId,
    excludeTaskId: taskId,
  });

  // Populate form when editing
  useEffect(() => {
    if (taskData) {
      setTitle(taskData.title);
      setDescription(taskData.description || '');
      setCategory(taskData.category);
      setDueDate(
        taskData.dueDate
          ? new Date(taskData.dueDate).toISOString().slice(0, 16)
          : ''
      );
      setDependsOnTaskId(taskData.dependsOnTaskId);
    }
  }, [taskData]);

  const createMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const deleteMutation = trpc.task.delete.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isEditing) {
      updateMutation.mutate({
        id: taskId,
        title,
        description: description || undefined,
        category,
        dueDate: dueDate ? new Date(dueDate) : null,
        dependsOnTaskId,
      });
    } else {
      createMutation.mutate({
        eventId,
        title,
        description: description || undefined,
        category,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        dependsOnTaskId: dependsOnTaskId || undefined,
      });
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate({ id: taskId! });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">
            {isEditing ? 'Edit Task' : 'Create Task'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter task description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pre_event">Pre-Event</option>
              <option value="during_event">During Event</option>
              <option value="post_event">Post-Event</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Depends On
            </label>
            <select
              value={dependsOnTaskId || ''}
              onChange={(e) => setDependsOnTaskId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No dependency</option>
              {availableDeps?.map((dep: DependencyTask) => (
                <option key={dep.id} value={dep.id}>
                  {dep.title} ({dep.status})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This task cannot be started until the dependent task is completed.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
              >
                Delete
              </button>
            )}
            <div className={`flex gap-3 ${!isEditing ? 'ml-auto' : ''}`}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
