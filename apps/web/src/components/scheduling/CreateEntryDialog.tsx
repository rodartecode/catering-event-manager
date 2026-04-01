'use client';

import { format } from 'date-fns';
import { useRef, useState } from 'react';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';

interface EventOption {
  id: number;
  name: string;
}

interface CreateEntryDialogProps {
  events: EventOption[];
  startTime: Date;
  endTime: Date;
  onConfirm: (eventId: number, taskId?: number) => void;
  onCancel: () => void;
}

export function CreateEntryDialog({
  events,
  startTime,
  endTime,
  onConfirm,
  onCancel,
}: CreateEntryDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('create-schedule-entry');
  useFocusTrap(dialogRef, { isOpen: true, onClose: onCancel });

  const [selectedEventId, setSelectedEventId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter(
    (e) => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedEventId === '') return;
    onConfirm(selectedEventId);
  };

  const formatTime = (date: Date) => format(date, 'h:mm a');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
      >
        <div className="p-4 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-semibold text-gray-800">
            Create Schedule Entry
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {format(startTime, 'EEE, MMM d')} &middot; {formatTime(startTime)} &ndash;{' '}
            {formatTime(endTime)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Event search + select */}
          <div>
            <label htmlFor="event-search" className="block text-sm font-medium text-gray-700 mb-1">
              Event
            </label>
            <input
              id="event-search"
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredEvents.length === 0 ? (
                <p className="p-3 text-sm text-gray-400 text-center">No events found</p>
              ) : (
                filteredEvents.map((event) => (
                  <label
                    key={event.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                      selectedEventId === event.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="event"
                      value={event.id}
                      checked={selectedEventId === event.id}
                      onChange={() => setSelectedEventId(event.id)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{event.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedEventId === ''}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
