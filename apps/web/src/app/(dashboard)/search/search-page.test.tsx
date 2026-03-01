import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock useSearchParams
let mockQueryParam = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'q' ? mockQueryParam || null : null),
  }),
}));

// Mock trpc
const fullResults = {
  events: [
    {
      id: 1,
      eventName: 'Annual Gala',
      location: 'Ballroom',
      status: 'planning',
      eventDate: '2026-06-15T00:00:00.000Z',
    },
  ],
  clients: [{ id: 1, companyName: 'Acme Corp', contactName: 'John Doe', email: 'john@acme.com' }],
  tasks: [{ id: 1, title: 'Setup Tables', status: 'pending', eventId: 1, category: 'pre_event' }],
  resources: [{ id: 1, name: 'Main Oven', type: 'equipment', isAvailable: true }],
};

let mockData: typeof fullResults | undefined = undefined;
let mockIsLoading = false;

vi.mock('@/lib/trpc', () => ({
  trpc: {
    search: {
      global: {
        useQuery: (_input: { query: string }, _opts: { enabled: boolean }) => ({
          data: mockData,
          isLoading: mockIsLoading,
        }),
      },
    },
  },
}));

import SearchPage from './page';

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryParam = '';
    mockData = undefined;
    mockIsLoading = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('shows prompt when no query parameter', () => {
    mockQueryParam = '';
    render(<SearchPage />);

    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText(/enter a search term in the search bar above/i)).toBeInTheDocument();
  });

  it('shows loading state while searching', () => {
    mockQueryParam = 'gala';
    mockIsLoading = true;

    render(<SearchPage />);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('shows no results message when query returns empty', () => {
    mockQueryParam = 'nonexistent';
    mockData = { events: [], clients: [], tasks: [], resources: [] };

    render(<SearchPage />);

    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it('renders categorized results with section headers', () => {
    mockQueryParam = 'gala';
    mockData = fullResults;

    render(<SearchPage />);

    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  it('renders event results with name, location, status, and date', () => {
    mockQueryParam = 'gala';
    mockData = fullResults;

    render(<SearchPage />);

    expect(screen.getByText('Annual Gala')).toBeInTheDocument();
    expect(screen.getByText('Ballroom')).toBeInTheDocument();
    expect(screen.getByText('planning')).toBeInTheDocument();
  });

  it('renders client results with company, contact, and email', () => {
    mockQueryParam = 'acme';
    mockData = fullResults;

    render(<SearchPage />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@acme.com')).toBeInTheDocument();
  });

  it('renders task results with title, category, and status', () => {
    mockQueryParam = 'setup';
    mockData = fullResults;

    render(<SearchPage />);

    expect(screen.getByText('Setup Tables')).toBeInTheDocument();
    expect(screen.getByText('pre event')).toBeInTheDocument();
  });

  it('renders resource results with name and type', () => {
    mockQueryParam = 'oven';
    mockData = fullResults;

    render(<SearchPage />);

    expect(screen.getByText('Main Oven')).toBeInTheDocument();
    expect(screen.getByText('equipment')).toBeInTheDocument();
  });

  it('links events to /events/{id}', () => {
    mockQueryParam = 'gala';
    mockData = fullResults;

    render(<SearchPage />);

    const link = screen.getByText('Annual Gala').closest('a');
    expect(link).toHaveAttribute('href', '/events/1');
  });

  it('links clients to /clients/{id}', () => {
    mockQueryParam = 'acme';
    mockData = fullResults;

    render(<SearchPage />);

    const link = screen.getByText('Acme Corp').closest('a');
    expect(link).toHaveAttribute('href', '/clients/1');
  });

  it('links tasks to /events/{eventId}', () => {
    mockQueryParam = 'setup';
    mockData = fullResults;

    render(<SearchPage />);

    const link = screen.getByText('Setup Tables').closest('a');
    expect(link).toHaveAttribute('href', '/events/1');
  });

  it('links resources to /resources/{id}', () => {
    mockQueryParam = 'oven';
    mockData = fullResults;

    render(<SearchPage />);

    const link = screen.getByText('Main Oven').closest('a');
    expect(link).toHaveAttribute('href', '/resources/1');
  });

  it('displays query in heading', () => {
    mockQueryParam = 'gala';
    mockData = fullResults;

    render(<SearchPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Search Results for');
  });

  it('only renders sections with results', () => {
    mockQueryParam = 'gala';
    mockData = {
      events: fullResults.events,
      clients: [],
      tasks: [],
      resources: [],
    };

    render(<SearchPage />);

    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
    expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
    expect(screen.queryByText('Resources')).not.toBeInTheDocument();
  });
});
