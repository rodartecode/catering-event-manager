'use client';

import { trpc } from '@/lib/trpc';
import { useParams, useRouter } from 'next/navigation';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { EventStatusTimeline } from '@/components/events/EventStatusTimeline';
import { EventStatusUpdateDialog } from '@/components/events/EventStatusUpdateDialog';
import { TaskList } from '@/components/tasks';
import { useState, useEffect } from 'react';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params.id);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const { data: event, isLoading, error } = trpc.event.getById.useQuery({ id: eventId });
  const archiveMutation = trpc.event.archive.useMutation({
    onSuccess: () => {
      setIsArchiveDialogOpen(false);
      router.push('/events');
    },
  });

  // Real-time status updates (T076)
  const utils = trpc.useUtils();
  useEffect(() => {
    const subscription = trpc.event.onStatusChange.subscribe(
      { eventId },
      {
        onData: (data) => {
          // Invalidate and refetch event data when status changes
          utils.event.getById.invalidate({ id: eventId });
        },
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId, utils]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">Event not found</p>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.eventDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const canArchive = event.status === 'completed' && !event.isArchived;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
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

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{event.eventName}</h1>
            <EventStatusBadge status={event.status} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsStatusDialogOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Update Status
            </button>

            {canArchive && (
              <button
                onClick={() => setIsArchiveDialogOpen(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Archive Event
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Event Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Event Date</label>
                <p className="text-gray-900">{formattedDate}</p>
              </div>

              {event.location && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900">{event.location}</p>
                </div>
              )}

              {event.estimatedAttendees && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Estimated Attendees
                  </label>
                  <p className="text-gray-900">{event.estimatedAttendees}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">
                  {new Date(event.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {event.notes && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="text-gray-900 mt-1">{event.notes}</p>
              </div>
            )}
          </div>

          {/* Client Information */}
          {event.client && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Client Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Company</label>
                  <p className="text-gray-900">{event.client.companyName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Contact Name</label>
                  <p className="text-gray-900">{event.client.contactName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{event.client.email}</p>
                </div>

                {event.client.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{event.client.phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tasks Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Tasks</h2>
            <TaskList
              eventId={eventId}
              isAdmin={true} // TODO: Get from session once auth is fully implemented
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Status History</h2>
            <EventStatusTimeline history={event.statusHistory} />
          </div>

          {event.isArchived && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-yellow-600 mt-0.5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Archived Event</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Archived on {new Date(event.archivedAt!).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Dialog */}
      {isStatusDialogOpen && (
        <EventStatusUpdateDialog
          eventId={eventId}
          currentStatus={event.status}
          onClose={() => setIsStatusDialogOpen(false)}
        />
      )}

      {/* Archive Confirmation Dialog */}
      {isArchiveDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Archive Event?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive this event? Archived events cannot be modified but
              remain accessible for historical records.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsArchiveDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => archiveMutation.mutate({ id: eventId })}
                disabled={archiveMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {archiveMutation.isPending ? 'Archiving...' : 'Archive Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
