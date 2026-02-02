import Link from 'next/link';
import { ResourceTypeBadge } from './ResourceTypeBadge';

interface ResourceCardProps {
  resource: {
    id: number;
    name: string;
    type: 'staff' | 'equipment' | 'materials';
    hourlyRate: string | null;
    isAvailable: boolean;
    notes: string | null;
    upcomingAssignments?: number;
  };
}

export function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <Link href={`/resources/${resource.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
            {resource.name}
          </h3>
          <ResourceTypeBadge type={resource.type} />
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          {/* Availability Status */}
          <div className="flex items-center">
            <span
              className={`inline-block w-2 h-2 rounded-full mr-2 ${
                resource.isAvailable ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span>{resource.isAvailable ? 'Available' : 'Unavailable'}</span>
          </div>

          {/* Hourly Rate */}
          {resource.hourlyRate && (
            <div className="flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>${resource.hourlyRate}/hr</span>
            </div>
          )}

          {/* Notes Preview */}
          {resource.notes && (
            <div className="flex items-start">
              <svg
                className="w-4 h-4 mr-2 text-gray-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="line-clamp-2">{resource.notes}</span>
            </div>
          )}
        </div>

        {/* Upcoming Assignments */}
        {resource.upcomingAssignments !== undefined && resource.upcomingAssignments > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>
                {resource.upcomingAssignments} upcoming assignment
                {resource.upcomingAssignments !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
