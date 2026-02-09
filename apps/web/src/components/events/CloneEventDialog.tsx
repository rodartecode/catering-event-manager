'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';
import { trpc } from '@/lib/trpc';

interface CloneEventDialogProps {
  sourceEvent: {
    id: number;
    eventName: string;
    location: string | null;
    estimatedAttendees: number | null;
    notes: string | null;
    client: {
      id: number | null;
      companyName: string | null;
    } | null;
  };
  onClose: () => void;
}

export function CloneEventDialog({ sourceEvent, onClose }: CloneEventDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('clone-dialog-title');

  const [eventDate, setEventDate] = useState('');
  const [eventName, setEventName] = useState(sourceEvent.eventName);
  const [location, setLocation] = useState(sourceEvent.location ?? '');
  const [estimatedAttendees, setEstimatedAttendees] = useState(
    sourceEvent.estimatedAttendees?.toString() ?? ''
  );
  const [notes, setNotes] = useState(sourceEvent.notes ?? '');
  const [dateError, setDateError] = useState('');

  useFocusTrap(dialogRef, { isOpen: true, onClose });

  const utils = trpc.useUtils();
  const cloneMutation = trpc.event.clone.useMutation({
    onSuccess: (newEvent) => {
      toast.success('Event cloned successfully');
      utils.event.list.invalidate();
      onClose();
      router.push(`/events/${newEvent.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDateError('');

    if (!eventDate) {
      setDateError('Event date is required');
      return;
    }

    cloneMutation.mutate({
      sourceEventId: sourceEvent.id,
      eventDate: new Date(eventDate),
      eventName: eventName !== sourceEvent.eventName ? eventName : undefined,
      location: location !== (sourceEvent.location ?? '') ? location || undefined : undefined,
      estimatedAttendees: estimatedAttendees
        ? Number(estimatedAttendees) !== sourceEvent.estimatedAttendees
          ? Number(estimatedAttendees)
          : undefined
        : undefined,
      notes: notes !== (sourceEvent.notes ?? '') ? notes || undefined : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-6">
          <h3 id={titleId} className="text-2xl font-semibold">
            Clone Event
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

        <p className="text-sm text-gray-600 mb-6">
          Create a new event based on <strong>{sourceEvent.eventName}</strong>. Tasks will be copied
          with due dates recalculated relative to the new event date.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="clone-event-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Event Date <span className="text-red-500">*</span>
            </label>
            <input
              id="clone-event-date"
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                setDateError('');
              }}
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                dateError ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {dateError && (
              <p className="text-sm text-red-600 mt-1" role="alert">
                {dateError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="clone-event-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Event Name
            </label>
            <input
              id="clone-event-name"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              maxLength={255}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="clone-location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location
            </label>
            <input
              id="clone-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="clone-attendees"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Estimated Attendees
            </label>
            <input
              id="clone-attendees"
              type="number"
              value={estimatedAttendees}
              onChange={(e) => setEstimatedAttendees(e.target.value)}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="clone-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="clone-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {cloneMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                {cloneMutation.error.message || 'Failed to clone event'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={cloneMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cloneMutation.isPending ? 'Cloning...' : 'Clone Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
