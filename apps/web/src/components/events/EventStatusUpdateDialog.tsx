'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';
import { trpc } from '@/lib/trpc';

type EventStatus =
  | 'inquiry'
  | 'planning'
  | 'preparation'
  | 'in_progress'
  | 'completed'
  | 'follow_up';

interface EventStatusUpdateDialogProps {
  eventId: number;
  currentStatus: EventStatus;
  onClose: () => void;
}

const statusOptions: { value: EventStatus; label: string; description: string }[] = [
  {
    value: 'inquiry',
    label: 'Inquiry',
    description: 'Initial client contact and requirements gathering',
  },
  {
    value: 'planning',
    label: 'Planning',
    description: 'Event details being finalized with client',
  },
  {
    value: 'preparation',
    label: 'Preparation',
    description: 'Tasks being completed before the event',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    description: 'Event is currently happening',
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'Event has finished successfully',
  },
  {
    value: 'follow_up',
    label: 'Follow Up',
    description: 'Post-event client communication and wrap-up',
  },
];

export function EventStatusUpdateDialog({
  eventId,
  currentStatus,
  onClose,
}: EventStatusUpdateDialogProps) {
  const [newStatus, setNewStatus] = useState<EventStatus>(currentStatus);
  const [notes, setNotes] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('status-dialog-title');

  // Trap focus within dialog and handle Escape key
  useFocusTrap(dialogRef, { isOpen: true, onClose });

  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.event.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated successfully');
      utils.event.getById.invalidate({ id: eventId });
      utils.event.list.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newStatus === currentStatus) {
      onClose();
      return;
    }

    updateStatusMutation.mutate({
      id: eventId,
      newStatus,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-6">
          <h3 id={titleId} className="text-2xl font-semibold">
            Update Event Status
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="w-5 h-5"
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">New Status</label>
            <div className="space-y-3">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                    newStatus === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={newStatus === option.value}
                    onChange={(e) => setNewStatus(e.target.value as EventStatus)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{option.label}</span>
                      {option.value === currentStatus && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes about this status change..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error Message */}
          {updateStatusMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                {updateStatusMutation.error.message || 'Failed to update status'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateStatusMutation.isPending || newStatus === currentStatus}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
