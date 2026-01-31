import Link from 'next/link';

interface ClientCardProps {
  client: {
    id: number;
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    portalEnabled?: boolean;
  };
  eventsCount?: number;
}

export function ClientCard({ client, eventsCount = 0 }: ClientCardProps) {
  return (
    <Link href={`/clients/${client.id}`} className="block group">
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 h-full">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
              {client.companyName}
            </h3>
            {client.portalEnabled && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Portal access enabled">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Portal
              </span>
            )}
          </div>
          {eventsCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {eventsCount} event{eventsCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>{client.contactName}</span>
          </div>

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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">{client.email}</span>
          </div>

          {client.phone && (
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
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span>{client.phone}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
