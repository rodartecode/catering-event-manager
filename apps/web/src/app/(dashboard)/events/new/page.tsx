'use client';

import { useRouter } from 'next/navigation';
import { EventForm } from '@/components/events/EventForm';

export default function NewEventPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Events
        </button>

        <h1 className="text-3xl font-bold">Create New Event</h1>
        <p className="text-gray-600 mt-2">
          Enter the event details below. You can update these later.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <EventForm
          onSuccess={(event) => {
            router.push(`/events/${event.id}`);
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
