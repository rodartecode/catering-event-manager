'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { trpc } from '@/lib/trpc';

const kitchenTypeLabels: Record<string, string> = {
  full: 'Full Kitchen',
  prep_only: 'Prep Only',
  warming_only: 'Warming Only',
  none: 'None',
};

type Tab = 'info' | 'events';

export default function VenueDetailPage() {
  const params = useParams();
  const venueId = Number(params.id);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const { data: venue, isLoading } = trpc.venue.getById.useQuery({ id: venueId });

  const { data: venueEvents } = trpc.event.list.useQuery({
    limit: 50,
  });

  // Filter events by this venue (client-side since event.list doesn't have venueId filter yet)
  // This is a placeholder — a dedicated venue.getVenueEvents procedure would be better for large datasets

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">Venue not found</p>
          <Link href="/venues" className="inline-block mt-4 text-blue-600 hover:text-blue-700">
            Back to venues
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: 'Details' },
    { id: 'events', label: 'Events' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/venues"
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center w-fit"
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
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{venue.name}</h1>
            <p className="text-gray-600 mt-1">{venue.address}</p>
          </div>
          <div className="flex gap-2">
            {venue.hasKitchen && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Kitchen Available
              </span>
            )}
            {!venue.isActive && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Inactive
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="-mb-px flex space-x-8" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Capacity</dt>
                <dd className="text-sm font-medium">
                  {venue.capacity ? `${venue.capacity} guests` : 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Kitchen</dt>
                <dd className="text-sm font-medium">
                  {venue.hasKitchen
                    ? venue.kitchenType
                      ? kitchenTypeLabels[venue.kitchenType] || venue.kitchenType
                      : 'Yes'
                    : 'No kitchen'}
                </dd>
              </div>
              {venue.equipmentAvailable && venue.equipmentAvailable.length > 0 && (
                <div>
                  <dt className="text-sm text-gray-500">Equipment Available</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {venue.equipmentAvailable.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {item}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {venue.notes && (
                <div>
                  <dt className="text-sm text-gray-500">Notes</dt>
                  <dd className="text-sm whitespace-pre-wrap">{venue.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Logistics */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Logistics</h2>
              <dl className="space-y-3">
                {venue.parkingNotes && (
                  <div>
                    <dt className="text-sm text-gray-500">Parking Notes</dt>
                    <dd className="text-sm whitespace-pre-wrap">{venue.parkingNotes}</dd>
                  </div>
                )}
                {venue.loadInNotes && (
                  <div>
                    <dt className="text-sm text-gray-500">Load-In Notes</dt>
                    <dd className="text-sm whitespace-pre-wrap">{venue.loadInNotes}</dd>
                  </div>
                )}
                {!venue.parkingNotes && !venue.loadInNotes && (
                  <p className="text-sm text-gray-500">No logistics notes</p>
                )}
              </dl>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Venue Contact</h2>
              <dl className="space-y-3">
                {venue.contactName && (
                  <div>
                    <dt className="text-sm text-gray-500">Contact Name</dt>
                    <dd className="text-sm font-medium">{venue.contactName}</dd>
                  </div>
                )}
                {venue.contactPhone && (
                  <div>
                    <dt className="text-sm text-gray-500">Phone</dt>
                    <dd className="text-sm">{venue.contactPhone}</dd>
                  </div>
                )}
                {venue.contactEmail && (
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="text-sm">{venue.contactEmail}</dd>
                  </div>
                )}
                {!venue.contactName && !venue.contactPhone && !venue.contactEmail && (
                  <p className="text-sm text-gray-500">No contact information</p>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Events at this Venue</h2>
          {!venueEvents?.items?.length ? (
            <p className="text-gray-500 text-sm">No events at this venue yet</p>
          ) : (
            <div className="space-y-3">
              {venueEvents.items.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium">{event.eventName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.eventDate).toLocaleDateString()} — {event.clientName}
                    </p>
                  </div>
                  <EventStatusBadge status={event.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
