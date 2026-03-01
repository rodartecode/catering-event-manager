import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock trpc
const mockResults = {
  events: [
    {
      id: 1,
      eventName: 'Annual Gala',
      location: 'Ballroom',
      status: 'planning',
      eventDate: '2026-06-15',
    },
  ],
  clients: [{ id: 1, companyName: 'Acme Corp', contactName: 'John', email: 'john@acme.com' }],
  tasks: [{ id: 1, title: 'Setup Tables', status: 'pending', eventId: 1, category: 'pre_event' }],
  resources: [{ id: 1, name: 'Main Oven', type: 'equipment', isAvailable: true }],
};

vi.mock('@/lib/trpc', () => ({
  trpc: {
    search: {
      global: {
        useQuery: (input: { query: string }, opts: { enabled: boolean }) => {
          // Return results only when enabled and query is long enough
          if (opts.enabled && input.query.length >= 2) {
            return { data: mockResults };
          }
          return { data: undefined };
        },
      },
    },
  },
}));

// Must import after mocks
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders search input', () => {
    render(<SearchBar />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search events, clients, tasks/i)).toBeInTheDocument();
  });

  it('does not show dropdown for queries shorter than 2 characters', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);

    await user.type(screen.getByLabelText('Search'), 'a');
    await vi.advanceTimersByTimeAsync(350);

    expect(screen.queryByText('Events')).not.toBeInTheDocument();
  });

  it('debounces query input by 300ms', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);

    const input = screen.getByLabelText('Search');
    await user.type(input, 'gala');

    // Before debounce completes, debouncedQuery should still be empty
    // After debounce, the dropdown should appear
    await vi.advanceTimersByTimeAsync(350);

    // After debounce, results should render (mock returns data for queries >= 2 chars)
    await waitFor(() => {
      expect(screen.getByText('Events')).toBeInTheDocument();
    });
  });

  it('shows dropdown with results after debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);

    await user.type(screen.getByLabelText('Search'), 'gala');
    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText('Annual Gala')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Setup Tables')).toBeInTheDocument();
      expect(screen.getByText('Main Oven')).toBeInTheDocument();
    });
  });

  it('navigates to search page on Enter key submission', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);

    const input = screen.getByLabelText('Search');
    await user.type(input, 'gala');
    await user.keyboard('{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/search?q=gala');
  });

  it('does not navigate on Enter when query is too short', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);

    await user.type(screen.getByLabelText('Search'), 'a');
    await user.keyboard('{Enter}');

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('encodes special characters in search URL', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);

    await user.type(screen.getByLabelText('Search'), 'foo bar');
    await user.keyboard('{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/search?q=foo%20bar');
  });

  it('closes dropdown and clears query on result selection', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar />);

    await user.type(screen.getByLabelText('Search'), 'gala');
    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText('Annual Gala')).toBeInTheDocument();
    });

    // Click a result
    await user.click(screen.getByText('Annual Gala'));

    // Dropdown should be dismissed
    expect(screen.queryByText('Events')).not.toBeInTheDocument();
  });

  it('dismisses dropdown on click outside', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <div>
        <SearchBar />
        <button type="button">Outside</button>
      </div>
    );

    await user.type(screen.getByLabelText('Search'), 'gala');
    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(screen.getByText('Events')).toBeInTheDocument();
    });

    // Click outside the search bar
    await user.click(screen.getByText('Outside'));

    expect(screen.queryByText('Events')).not.toBeInTheDocument();
  });
});
