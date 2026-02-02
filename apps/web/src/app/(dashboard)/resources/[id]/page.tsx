'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { EditResourceForm } from '@/components/resources/EditResourceForm';
import { ResourceScheduleCalendar } from '@/components/resources/ResourceScheduleCalendar';
import { ResourceTypeBadge } from '@/components/resources/ResourceTypeBadge';
import { trpc } from '@/lib/trpc';

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = Number(params.id);
  const [isEditing, setIsEditing] = useState(false);

  // Date range for schedule (default: current week +/- 2 weeks)
  const [startDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return date;
  });
  const [endDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date;
  });

  const { data: resource, isLoading: resourceLoading } = trpc.resource.getById.useQuery(
    { id: resourceId },
    { enabled: !isNaN(resourceId) }
  );

  const { data: scheduleData, isLoading: scheduleLoading } = trpc.resource.getSchedule.useQuery(
    {
      resourceId,
      startDate,
      endDate,
    },
    { enabled: !isNaN(resourceId) }
  );

  const deleteMutation = trpc.resource.delete.useMutation({
    onSuccess: () => {
      router.push('/resources');
    },
  });

  const handleDelete = () => {
    if (
      window.confirm('Are you sure you want to delete this resource? This action cannot be undone.')
    ) {
      deleteMutation.mutate({ id: resourceId });
    }
  };

  if (resourceLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Resource Not Found</h2>
          <p className="text-gray-500 mb-4">
            The resource you&apos;re looking for doesn&apos;t exist.
          </p>
          <button
            onClick={() => router.push('/resources')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Resources
          </button>
        </div>
      </div>
    );
  }

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
          Back to Resources
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{resource.name}</h1>
              <ResourceTypeBadge type={resource.type} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  resource.isAvailable ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-gray-600">
                {resource.isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Edit Resource</h2>
          <EditResourceForm
            resource={resource}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {/* Resource Details */}
      {!isEditing && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Hourly Rate</h3>
              <p className="text-2xl font-semibold">
                {resource.hourlyRate ? `$${resource.hourlyRate}` : 'Not set'}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Upcoming Assignments</h3>
              <p className="text-2xl font-semibold">{resource.upcomingAssignments || 0}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
              <p className="text-lg">
                {new Date(resource.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Notes Section */}
          {resource.notes && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold mb-3">Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{resource.notes}</p>
            </div>
          )}

          {/* Schedule Calendar */}
          <div className="mb-8" data-testid="resource-schedule">
            <h2 className="text-xl font-semibold mb-4">Schedule</h2>
            {scheduleLoading ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading schedule...</p>
              </div>
            ) : (
              <ResourceScheduleCalendar
                entries={scheduleData?.entries || []}
                onEntryClick={(entry) => {
                  router.push(`/events/${entry.eventId}`);
                }}
              />
            )}
          </div>
        </>
      )}

      {/* Delete Error */}
      {deleteMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-red-800">{deleteMutation.error.message}</p>
        </div>
      )}
    </div>
  );
}
