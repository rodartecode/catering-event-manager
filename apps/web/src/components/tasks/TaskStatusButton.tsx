'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface TaskStatusButtonProps {
  taskId: number;
  currentStatus: 'pending' | 'in_progress' | 'completed';
  onStatusChange?: () => void;
}

const statusTransitions: Record<string, { next: string; label: string; className: string }> = {
  pending: {
    next: 'in_progress',
    label: 'Start',
    className: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  in_progress: {
    next: 'completed',
    label: 'Complete',
    className: 'bg-green-600 hover:bg-green-700 text-white',
  },
  completed: {
    next: 'pending',
    label: 'Reopen',
    className: 'bg-gray-600 hover:bg-gray-700 text-white',
  },
};

export function TaskStatusButton({ taskId, currentStatus, onStatusChange }: TaskStatusButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.task.updateStatus.useMutation({
    onSuccess: () => {
      utils.task.listByEvent.invalidate();
      utils.task.getById.invalidate({ id: taskId });
      utils.event.getById.invalidate();
      setError(null);
      onStatusChange?.();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const transition = statusTransitions[currentStatus];

  const handleClick = () => {
    setError(null);
    updateStatusMutation.mutate({
      id: taskId,
      newStatus: transition.next as 'pending' | 'in_progress' | 'completed',
    });
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={updateStatusMutation.isPending}
        className={`px-4 py-2 text-sm font-medium rounded transition disabled:opacity-50 ${transition.className}`}
      >
        {updateStatusMutation.isPending ? 'Updating...' : transition.label}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-[200px]">{error}</p>}
    </div>
  );
}
