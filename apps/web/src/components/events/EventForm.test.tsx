import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventForm } from './EventForm';

// Mock tRPC hooks completely
vi.mock('@/lib/trpc', () => ({
  trpc: {
    clients: {
      list: {
        useQuery: vi.fn().mockReturnValue({
          data: [
            { id: 1, companyName: 'Test Client', contactName: 'John Doe' },
            { id: 2, companyName: 'Another Client', contactName: 'Jane Smith' },
          ],
          isLoading: false,
        }),
      },
    },
    template: {
      list: {
        useQuery: vi.fn().mockReturnValue({
          data: [
            { id: 1, name: 'Standard Event', description: 'Test', itemCount: 12 },
            { id: 2, name: 'Large Event', description: 'Test', itemCount: 14 },
            { id: 3, name: 'Simple Delivery', description: 'Test', itemCount: 8 },
          ],
          isLoading: false,
        }),
      },
    },
    event: {
      create: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

// Create a simple wrapper with just QueryClient (no tRPC provider needed with mocks)
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: createTestWrapper() });
}

describe('EventForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders template dropdown', () => {
    renderWithProviders(<EventForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/task template/i)).toBeInTheDocument();
  });

  it('shows template options with task counts', () => {
    renderWithProviders(<EventForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const templateSelect = screen.getByLabelText(/task template/i);
    expect(templateSelect).toBeInTheDocument();

    // Check that template options are present with task counts
    expect(screen.getByText('Standard Event (12 tasks)')).toBeInTheDocument();
    expect(screen.getByText('Large Event (14 tasks)')).toBeInTheDocument();
    expect(screen.getByText('Simple Delivery (8 tasks)')).toBeInTheDocument();
  });

  it('shows "None" as default option', () => {
    renderWithProviders(<EventForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText('None - start with no tasks')).toBeInTheDocument();
  });

  it('renders help text for template selection', () => {
    renderWithProviders(<EventForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText(/select a template to auto-generate tasks/i)).toBeInTheDocument();
  });

  it('marks template as optional', () => {
    renderWithProviders(<EventForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('renders all required form fields', () => {
    renderWithProviders(<EventForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/event name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/event date/i)).toBeInTheDocument();
  });
});
