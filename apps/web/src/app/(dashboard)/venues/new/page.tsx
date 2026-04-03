'use client';

import { useRouter } from 'next/navigation';
import { VenueForm } from '@/components/venues/VenueForm';

export default function NewVenuePage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          <svg
            aria-hidden="true"
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Venues
        </button>

        <h1 className="text-3xl font-bold">Add New Venue</h1>
        <p className="text-gray-600 mt-2">
          Create a venue profile with logistics details for event planning.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <VenueForm
          onSuccess={(venue) => {
            router.push(`/venues/${venue.id}`);
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
