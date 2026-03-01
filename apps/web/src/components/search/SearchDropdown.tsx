'use client';

import Link from 'next/link';
import type { RouterOutput } from '@/lib/trpc';

type SearchResults = RouterOutput['search']['global'];

interface SearchDropdownProps {
  results: SearchResults;
  onSelect: () => void;
}

interface ResultItemProps {
  href: string;
  label: string;
  detail?: string | null;
  onSelect: () => void;
}

function ResultItem({ href, label, detail, onSelect }: ResultItemProps) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="block px-3 py-2 hover:bg-gray-100 rounded text-sm"
    >
      <span className="font-medium text-gray-900">{label}</span>
      {detail && <span className="text-gray-500 ml-2">{detail}</span>}
    </Link>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {title}
    </div>
  );
}

export function SearchDropdown({ results, onSelect }: SearchDropdownProps) {
  const hasResults =
    results.events.length > 0 ||
    results.clients.length > 0 ||
    results.tasks.length > 0 ||
    results.resources.length > 0;

  if (!hasResults) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-3">
        <p className="text-sm text-gray-500 text-center">No results found</p>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
      {results.events.length > 0 && (
        <div className="py-1">
          <SectionHeader title="Events" />
          {results.events.slice(0, 3).map((event) => (
            <ResultItem
              key={`event-${event.id}`}
              href={`/events/${event.id}`}
              label={event.eventName}
              detail={event.location}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {results.clients.length > 0 && (
        <div className="py-1">
          <SectionHeader title="Clients" />
          {results.clients.slice(0, 3).map((client) => (
            <ResultItem
              key={`client-${client.id}`}
              href={`/clients/${client.id}`}
              label={client.companyName}
              detail={client.contactName}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {results.tasks.length > 0 && (
        <div className="py-1">
          <SectionHeader title="Tasks" />
          {results.tasks.slice(0, 3).map((task) => (
            <ResultItem
              key={`task-${task.id}`}
              href={`/events/${task.eventId}`}
              label={task.title}
              detail={task.status}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {results.resources.length > 0 && (
        <div className="py-1">
          <SectionHeader title="Resources" />
          {results.resources.slice(0, 3).map((resource) => (
            <ResultItem
              key={`resource-${resource.id}`}
              href={`/resources/${resource.id}`}
              label={resource.name}
              detail={resource.type}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
