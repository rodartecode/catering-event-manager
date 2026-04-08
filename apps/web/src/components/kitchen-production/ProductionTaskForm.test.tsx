import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductionTaskForm } from './ProductionTaskForm';

const { mockMutate, mockCreateIsPending, mockCapturedOnError } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockCreateIsPending: { value: false },
  mockCapturedOnError: { value: undefined as ((error: { message: string }) => void) | undefined },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    kitchenProduction: {
      task: {
        create: {
          useMutation: vi
            .fn()
            .mockImplementation((opts?: { onError?: (error: { message: string }) => void }) => {
              mockCapturedOnError.value = opts?.onError;
              return {
                mutate: mockMutate,
                isPending: mockCreateIsPending.value,
              };
            }),
        },
      },
      station: {
        list: {
          useQuery: vi.fn().mockReturnValue({
            data: [
              { id: 1, name: 'Main Oven' },
              { id: 2, name: 'Cold Storage' },
            ],
          }),
        },
      },
    },
    useUtils: vi.fn().mockReturnValue({
      kitchenProduction: {
        timeline: { getByEvent: { invalidate: vi.fn() } },
        task: { list: { invalidate: vi.fn() } },
      },
    }),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

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

describe('ProductionTaskForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const defaultProps = { eventId: 42, onSuccess: mockOnSuccess, onCancel: mockOnCancel };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateIsPending.value = false;
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/prep type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/station/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hours before/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/servings/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders all 10 prep type options', () => {
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      const select = screen.getByLabelText(/prep type/i);
      expect(select.querySelectorAll('option')).toHaveLength(10);
    });

    it('renders station options from query data', () => {
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
      expect(screen.getByText('Main Oven')).toBeInTheDocument();
      expect(screen.getByText('Cold Storage')).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      expect(screen.getByText('Add Task')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onCancel when Cancel clicked', () => {
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      screen.getByText('Cancel').click();
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('shows error when task name is empty on submit', async () => {
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      const form = screen.getByText('Add Task').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('Task name is required')).toBeInTheDocument();
      });
    });

    it('clears field error when user types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      const form = screen.getByText('Add Task').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('Task name is required')).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/task name/i), 'A');
      expect(screen.queryByText('Task name is required')).not.toBeInTheDocument();
    });

    it('calls mutate with valid data and correct offset conversion', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      await user.type(screen.getByLabelText(/task name/i), 'Marinate chicken');
      const form = screen.getByText('Add Task').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          eventId: 42,
          name: 'Marinate chicken',
          prepType: 'chop',
          durationMinutes: 30,
          offsetMinutes: -240,
          stationId: undefined,
          servings: undefined,
          notes: undefined,
        });
      });
    });

    it('submits with station selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      await user.type(screen.getByLabelText(/task name/i), 'Grill steaks');
      await user.selectOptions(screen.getByLabelText(/station/i), '1');
      const form = screen.getByText('Add Task').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ stationId: 1 }));
      });
    });
  });

  describe('pending state', () => {
    it('shows Creating... and disables button when pending', () => {
      mockCreateIsPending.value = true;
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      const button = screen.getByText('Creating...');
      expect(button).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('displays submit error from mutation', async () => {
      renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      act(() => {
        mockCapturedOnError.value?.({ message: 'Station at capacity' });
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Station at capacity');
    });
  });

  describe('accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderWithProviders(<ProductionTaskForm {...defaultProps} />);
      const results = await (await import('../../../test/helpers/axe')).axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
