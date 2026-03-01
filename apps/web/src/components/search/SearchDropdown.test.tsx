import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchDropdown } from './SearchDropdown';

const fullResults = {
  events: [
    {
      id: 1,
      eventName: 'Annual Gala',
      location: 'Ballroom',
      status: 'planning' as const,
      eventDate: new Date('2026-06-15'),
    },
    {
      id: 2,
      eventName: 'Corporate Lunch',
      location: 'Rooftop',
      status: 'inquiry' as const,
      eventDate: new Date('2026-07-01'),
    },
  ],
  clients: [{ id: 1, companyName: 'Acme Corp', contactName: 'John Doe', email: 'john@acme.com' }],
  tasks: [
    {
      id: 1,
      title: 'Setup Tables',
      status: 'pending' as const,
      eventId: 1,
      category: 'pre_event' as const,
    },
  ],
  resources: [{ id: 1, name: 'Main Oven', type: 'equipment' as const, isAvailable: true }],
};

const emptyResults = {
  events: [],
  clients: [],
  tasks: [],
  resources: [],
};

describe('SearchDropdown', () => {
  const onSelect = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders grouped results with section headers', () => {
    render(<SearchDropdown results={fullResults} onSelect={onSelect} />);

    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  it('renders event results with name and location', () => {
    render(<SearchDropdown results={fullResults} onSelect={onSelect} />);

    expect(screen.getByText('Annual Gala')).toBeInTheDocument();
    expect(screen.getByText('Ballroom')).toBeInTheDocument();
    expect(screen.getByText('Corporate Lunch')).toBeInTheDocument();
    expect(screen.getByText('Rooftop')).toBeInTheDocument();
  });

  it('renders client results with company name and contact', () => {
    render(<SearchDropdown results={fullResults} onSelect={onSelect} />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders task results with title and status', () => {
    render(<SearchDropdown results={fullResults} onSelect={onSelect} />);

    expect(screen.getByText('Setup Tables')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('renders resource results with name and type', () => {
    render(<SearchDropdown results={fullResults} onSelect={onSelect} />);

    expect(screen.getByText('Main Oven')).toBeInTheDocument();
    expect(screen.getByText('equipment')).toBeInTheDocument();
  });

  it('shows empty state when no results', () => {
    render(<SearchDropdown results={emptyResults} onSelect={onSelect} />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.queryByText('Events')).not.toBeInTheDocument();
  });

  it('links events to /events/{id}', () => {
    render(<SearchDropdown results={fullResults} onSelect={onSelect} />);

    const galaLink = screen.getByText('Annual Gala').closest('a');
    expect(galaLink).toHaveAttribute('href', '/events/1');
  });

  it('links clients to /clients/{id}', () => {
    render(<SearchDropdown results={fullResults} onSelect={onSelect} />);

    const clientLink = screen.getByText('Acme Corp').closest('a');
    expect(clientLink).toHaveAttribute('href', '/clients/1');
  });

  it('links tasks to /events/{eventId}', () => {
    render(<SearchDropdown results={fullResults} onSelect={onSelect} />);

    const taskLink = screen.getByText('Setup Tables').closest('a');
    expect(taskLink).toHaveAttribute('href', '/events/1');
  });

  it('links resources to /resources/{id}', () => {
    render(<SearchDropdown results={fullResults} onSelect={onSelect} />);

    const resourceLink = screen.getByText('Main Oven').closest('a');
    expect(resourceLink).toHaveAttribute('href', '/resources/1');
  });

  it('slices results to max 3 per category', () => {
    const manyEvents = {
      ...emptyResults,
      events: [
        {
          id: 1,
          eventName: 'Event One',
          location: null,
          status: 'planning' as const,
          eventDate: new Date('2026-01-01'),
        },
        {
          id: 2,
          eventName: 'Event Two',
          location: null,
          status: 'planning' as const,
          eventDate: new Date('2026-02-01'),
        },
        {
          id: 3,
          eventName: 'Event Three',
          location: null,
          status: 'planning' as const,
          eventDate: new Date('2026-03-01'),
        },
        {
          id: 4,
          eventName: 'Event Four',
          location: null,
          status: 'planning' as const,
          eventDate: new Date('2026-04-01'),
        },
        {
          id: 5,
          eventName: 'Event Five',
          location: null,
          status: 'planning' as const,
          eventDate: new Date('2026-05-01'),
        },
      ],
    };

    render(<SearchDropdown results={manyEvents} onSelect={onSelect} />);

    expect(screen.getByText('Event One')).toBeInTheDocument();
    expect(screen.getByText('Event Two')).toBeInTheDocument();
    expect(screen.getByText('Event Three')).toBeInTheDocument();
    expect(screen.queryByText('Event Four')).not.toBeInTheDocument();
    expect(screen.queryByText('Event Five')).not.toBeInTheDocument();
  });

  it('only renders sections that have results', () => {
    const eventsOnly = {
      ...emptyResults,
      events: [
        {
          id: 1,
          eventName: 'Solo Event',
          location: null,
          status: 'planning' as const,
          eventDate: new Date('2026-01-01'),
        },
      ],
    };

    render(<SearchDropdown results={eventsOnly} onSelect={onSelect} />);

    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
    expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
    expect(screen.queryByText('Resources')).not.toBeInTheDocument();
  });
});
