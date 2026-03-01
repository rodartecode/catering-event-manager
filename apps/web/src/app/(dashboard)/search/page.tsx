'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';

function EventStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    inquiry: 'bg-yellow-100 text-yellow-800',
    planning: 'bg-blue-100 text-blue-800',
    preparation: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    follow_up: 'bg-orange-100 text-orange-800',
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const { data: results, isLoading } = trpc.search.global.useQuery(
    { query },
    { enabled: query.length >= 2 }
  );

  if (!query) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Search</h1>
        <p className="text-gray-500">
          Enter a search term in the search bar above to find events, clients, tasks, and resources.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Search Results</h1>
        <p className="text-gray-500">Searching...</p>
      </div>
    );
  }

  const hasResults =
    results &&
    (results.events.length > 0 ||
      results.clients.length > 0 ||
      results.tasks.length > 0 ||
      results.resources.length > 0);

  if (!hasResults) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Search Results</h1>
        <p className="text-gray-500">No results found for &ldquo;{query}&rdquo;</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Search Results for &ldquo;{query}&rdquo;
      </h1>

      <div className="space-y-8">
        {results.events.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Events</h2>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {results.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{event.eventName}</span>
                      {event.location && (
                        <span className="text-gray-500 ml-2">{event.location}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <EventStatusBadge status={event.status} />
                      <span className="text-sm text-gray-500">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {results.clients.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Clients</h2>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {results.clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{client.companyName}</span>
                  <span className="text-gray-500 ml-2">{client.contactName}</span>
                  <span className="text-gray-400 ml-2 text-sm">{client.email}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {results.tasks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Tasks</h2>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {results.tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/events/${task.eventId}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{task.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {task.category.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">{task.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {results.resources.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Resources</h2>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {results.resources.map((resource) => (
                <Link
                  key={resource.id}
                  href={`/resources/${resource.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{resource.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {resource.type}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${resource.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
