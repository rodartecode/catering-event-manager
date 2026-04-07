import Link from 'next/link';
import { StationTypeBadge } from './StationTypeBadge';

interface StationCardProps {
  station: {
    id: number;
    name: string;
    type: string;
    capacity: number;
    venueId: number | null;
    notes: string | null;
  };
  venueName?: string;
}

export function StationCard({ station, venueName }: StationCardProps) {
  return (
    <Link href={`/kitchen-production/stations/${station.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
            {station.name}
          </h3>
          <StationTypeBadge type={station.type} />
        </div>

        <div className="space-y-2 text-sm text-gray-600">
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span>
              Capacity: {station.capacity} concurrent task{station.capacity !== 1 ? 's' : ''}
            </span>
          </div>

          {venueName && (
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span>{venueName}</span>
            </div>
          )}

          {station.notes && <p className="text-gray-500 line-clamp-2 mt-2">{station.notes}</p>}
        </div>
      </div>
    </Link>
  );
}
