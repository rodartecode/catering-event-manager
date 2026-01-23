'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface Event {
  id: number;
  eventName: string;
  eventDate: Date;
}

interface CommunicationFormProps {
  clientId: number;
  events: Event[];
  onSuccess?: () => void;
}

export function CommunicationForm({ clientId, events, onSuccess }: CommunicationFormProps) {
  const [eventId, setEventId] = useState<number | ''>('');
  const [type, setType] = useState<'email' | 'phone' | 'meeting' | 'other'>('email');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const recordCommunication = trpc.clients.recordCommunication.useMutation({
    onSuccess: () => {
      // Reset form
      setEventId('');
      setType('email');
      setSubject('');
      setNotes('');
      setFollowUpDate('');
      setIsExpanded(false);
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    recordCommunication.mutate({
      clientId,
      eventId: Number(eventId),
      type,
      subject: subject || undefined,
      notes: notes || undefined,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    });
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Record New Communication
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Record Communication</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-1">
              Event <span className="text-red-500">*</span>
            </label>
            <select
              id="event"
              value={eventId}
              onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.eventName} - {new Date(event.eventDate).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of the communication"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Detailed notes about the communication..."
          />
        </div>

        <div>
          <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700 mb-1">
            Schedule Follow-Up (optional)
          </label>
          <input
            id="followUpDate"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {recordCommunication.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {recordCommunication.error.message}
        </div>
      )}

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!eventId || recordCommunication.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {recordCommunication.isPending ? 'Saving...' : 'Save Communication'}
        </button>
      </div>
    </form>
  );
}
