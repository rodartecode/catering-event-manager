'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';
import { trpc } from '@/lib/trpc';

interface TaskAssignDialogProps {
  taskId: number;
  onClose: () => void;
  onSuccess: () => void;
}

// Type is inferred from tRPC - users are filtered to exclude clients

export function TaskAssignDialog({ taskId, onClose, onSuccess }: TaskAssignDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('assign-dialog-title');

  // Trap focus within dialog and handle Escape key
  useFocusTrap(dialogRef, { isOpen: true, onClose });

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
      toast.success('Task assigned successfully');
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
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
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 id={titleId} className="text-xl font-semibold">
            Assign Task
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Team Member</label>
          {usersLoading ? (
            <div
              className="flex justify-center py-4"
              aria-busy="true"
              aria-label="Loading team members"
            >
              <div
                className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"
                aria-hidden="true"
              ></div>
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

              {users?.map((user) => (
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
                    {user.email} ·{' '}
                    {user.role === 'administrator'
                      ? 'Admin'
                      : user.role === 'manager'
                        ? 'Manager'
                        : 'Client'}
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
