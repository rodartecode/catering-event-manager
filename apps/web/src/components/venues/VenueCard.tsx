import Link from 'next/link';

interface VenueCardProps {
  venue: {
    id: number;
    name: string;
    address: string;
    capacity: number | null;
    hasKitchen: boolean;
    equipmentAvailable: string[] | null;
  };
  eventsCount?: number;
}

export function VenueCard({ venue, eventsCount = 0 }: VenueCardProps) {
  const equipmentCount = venue.equipmentAvailable?.length ?? 0;

  return (
    <Link href={`/venues/${venue.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
            {venue.name}
          </h3>
          <div className="flex gap-2">
            {venue.hasKitchen && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Kitchen
              </span>
            )}
            {eventsCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {eventsCount} event{eventsCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          {/* Address */}
          <div className="flex items-start">
            <svg
              aria-hidden="true"
              className="w-4 h-4 mr-2 mt-0.5 text-gray-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
            <span className="line-clamp-2">{venue.address}</span>
          </div>

          {/* Capacity */}
          {venue.capacity && (
            <div className="flex items-center">
              <svg
                aria-hidden="true"
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>Capacity: {venue.capacity}</span>
            </div>
          )}

          {/* Equipment count */}
          {equipmentCount > 0 && (
            <div className="flex items-center">
              <svg
                aria-hidden="true"
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              <span>
                {equipmentCount} equipment item{equipmentCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
