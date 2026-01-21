'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

interface TaskAssignDialogProps {
  taskId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface AssignableUser {
  id: number;
  name: string;
  email: string;
  role: 'administrator' | 'manager';
}

export function TaskAssignDialog({ taskId, onClose, onSuccess }: TaskAssignDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch task details
  const { data: task } = trpc.task.getById.useQuery({ id: taskId });

  // Fetch assignable users
  const { data: users, isLoading: usersLoading } = trpc.task.getAssignableUsers.useQuery();

  // Initialize selected user when task loads
  useState(() => {
    if (task?.assignedTo) {
      setSelectedUserId(task.assignedTo);
    }
  });

  const assignMutation = trpc.task.assign.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleAssign = () => {
    setError(null);
    assignMutation.mutate({
      taskId,
      userId: selectedUserId,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Assign Task</h3>
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

        {task && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{task.title}</p>
            {task.assignee && (
              <p className="text-sm text-gray-500 mt-1">
                Currently assigned to: {task.assignee.name}
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Team Member
          </label>
          {usersLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                onClick={() => setSelectedUserId(null)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                  selectedUserId === null
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">Unassigned</p>
                <p className="text-sm text-gray-500">Remove assignment</p>
              </button>

              {users?.map((user: AssignableUser) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                    selectedUserId === user.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">
                    {user.email} · {user.role === 'administrator' ? 'Admin' : 'Manager'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={assignMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
