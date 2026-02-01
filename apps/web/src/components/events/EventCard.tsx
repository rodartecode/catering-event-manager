import Link from 'next/link';
import { EventStatusBadge } from './EventStatusBadge';

interface EventCardProps {
  event: {
    id: number;
    eventName: string;
    clientName: string | null;
    eventDate: Date;
    status: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up';
    taskCount: number;
    completedTaskCount: number;
  };
}

export function EventCard({ event }: EventCardProps) {
  const taskProgress =
    event.taskCount > 0
      ? Math.round((event.completedTaskCount / event.taskCount) * 100)
      : 0;

  const formattedDate = new Date(event.eventDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
            {event.eventName}
          </h3>
          <EventStatusBadge status={event.status} />
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>{event.clientName || 'Unknown Client'}</span>
          </div>

          <div className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-gray-400"
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
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Task Progress */}
        {event.taskCount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tasks</span>
              <span>
                {event.completedTaskCount}/{event.taskCount}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
