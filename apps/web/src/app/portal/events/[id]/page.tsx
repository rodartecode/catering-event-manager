'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';

function EventStatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    inquiry: 'bg-purple-100 text-purple-800',
    planning: 'bg-blue-100 text-blue-800',
    preparation: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    follow_up: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    inquiry: 'Inquiry',
    planning: 'Planning',
    preparation: 'Preparation',
    in_progress: 'In Progress',
    completed: 'Completed',
    follow_up: 'Follow Up',
  };

  return (
    <span
      className={`px-3 py-1 text-sm font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

function EventTimeline({ eventId }: { eventId: number }) {
  const { data: timeline, isLoading } = trpc.portal.getEventTimeline.useQuery({ eventId });

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded" />;
  }

  if (!timeline || timeline.length === 0) {
    return <p className="text-gray-500 text-sm">No status changes recorded yet.</p>;
  }

  const statusLabels: Record<string, string> = {
    inquiry: 'Inquiry',
    planning: 'Planning',
    preparation: 'Preparation',
    in_progress: 'In Progress',
    completed: 'Completed',
    follow_up: 'Follow Up',
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {timeline.map((entry, idx) => (
          <li key={entry.id}>
            <div className="relative pb-8">
              {idx !== timeline.length - 1 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                      idx === timeline.length - 1 ? 'bg-blue-500' : 'bg-gray-400'
                    }`}
                  >
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-900">
                      Status changed from{' '}
                      <span className="font-medium">
                        {statusLabels[entry.oldStatus || ''] || entry.oldStatus || 'New'}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {statusLabels[entry.newStatus] || entry.newStatus}
                      </span>
                    </p>
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    {entry.changedAt &&
                      new Date(entry.changedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventTasks({ eventId }: { eventId: number }) {
  const { data: tasks, isLoading } = trpc.portal.getEventTasks.useQuery({ eventId });

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded" />;
  }

  if (!tasks || tasks.length === 0) {
    return <p className="text-gray-500 text-sm">No tasks assigned to this event yet.</p>;
  }

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>
            {completedCount} of {tasks.length} tasks completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <ul className="divide-y divide-gray-200">
        {tasks.map((task) => (
          <li key={task.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  task.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : task.isOverdue
                      ? 'border-red-500'
                      : 'border-gray-300'
                }`}
              >
                {task.status === 'completed' && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p
                  className={`text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                >
                  {task.title}
                </p>
                {task.dueDate && (
                  <p
                    className={`text-xs ${task.isOverdue && task.status !== 'completed' ? 'text-red-600' : 'text-gray-500'}`}
                  >
                    Due:{' '}
                    {new Date(task.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {task.isOverdue && task.status !== 'completed' && ' (Overdue)'}
                  </p>
                )}
              </div>
            </div>
            <TaskStatusBadge status={task.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventCommunications({ eventId }: { eventId: number }) {
  const { data: communications, isLoading } = trpc.portal.getEventCommunications.useQuery({
    eventId,
  });

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded" />;
  }

  if (!communications || communications.length === 0) {
    return <p className="text-gray-500 text-sm">No communications logged yet.</p>;
  }

  const typeIcons: Record<string, React.ReactNode> = {
    email: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    phone: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    ),
    meeting: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    note: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  };

  const typeLabels: Record<string, string> = {
    email: 'Email',
    phone: 'Phone Call',
    meeting: 'Meeting',
    note: 'Note',
  };

  return (
    <ul className="divide-y divide-gray-200">
      {communications.map((comm) => (
        <li key={comm.id} className="py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 bg-gray-100 rounded-full text-gray-600">
              {typeIcons[comm.type] || typeIcons.note}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {typeLabels[comm.type] || comm.type}
                </span>
                <span className="text-xs text-gray-400">
                  {comm.contactedAt &&
                    new Date(comm.contactedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                </span>
              </div>
              {comm.subject && <p className="text-sm text-gray-900 mt-1">{comm.subject}</p>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PortalEventDetailPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const eventId = Number(params.id);

  const {
    data: event,
    isLoading,
    error,
  } = trpc.portal.getEvent.useQuery(
    { eventId },
    { enabled: authStatus === 'authenticated' && !Number.isNaN(eventId) }
  );

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/portal/login');
    }
  }, [authStatus, router]);

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Link
          href="/portal/events"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Events
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Event not found or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/portal/events"
        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Events
      </Link>

      {/* Event Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.eventName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {event.eventDate
                  ? new Date(event.eventDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Date TBD'}
              </div>
              {event.location && (
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {event.location}
                </div>
              )}
              {event.estimatedAttendees && (
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {event.estimatedAttendees} guests
                </div>
              )}
            </div>
          </div>
          <EventStatusBadge status={event.status} />
        </div>

        {event.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
            <p className="text-gray-700">{event.notes}</p>
          </div>
        )}
      </div>

      {/* Task Progress Summary */}
      {event.taskProgress && event.taskProgress.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">
              {event.taskProgress.completed} of {event.taskProgress.total} tasks completed
            </p>
            <p className="text-sm text-blue-700">
              {Math.round((event.taskProgress.completed / event.taskProgress.total) * 100)}%
              complete
            </p>
          </div>
        </div>
      )}

      {/* Content Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Timeline</h2>
          <EventTimeline eventId={eventId} />
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h2>
          <EventTasks eventId={eventId} />
        </div>
      </div>

      {/* Communications */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Communication History</h2>
        <EventCommunications eventId={eventId} />
      </div>
    </div>
  );
}
