import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StationForm } from './StationForm';

const { mockMutate, mockCreateIsPending, mockCapturedOnError } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockCreateIsPending: { value: false },
  mockCapturedOnError: { value: undefined as ((error: { message: string }) => void) | undefined },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    venue: {
      list: {
        useQuery: vi.fn().mockReturnValue({
          data: [
            { id: 1, name: 'Grand Hall' },
            { id: 2, name: 'Garden Terrace' },
          ],
        }),
      },
    },
    kitchenProduction: {
      station: {
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
    },
  },
}));

vi.mock('@/hooks/use-form-dirty', () => ({
  useFormDirty: vi.fn().mockReturnValue({ isDirty: false, markClean: vi.fn() }),
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

describe('StationForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const defaultProps = { onSuccess: mockOnSuccess, onCancel: mockOnCancel };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateIsPending.value = false;
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      renderWithProviders(<StationForm {...defaultProps} />);
      expect(screen.getByLabelText(/station name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/station type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/concurrent capacity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/venue/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders all 7 station type options', () => {
      renderWithProviders(<StationForm {...defaultProps} />);
      const select = screen.getByLabelText(/station type/i);
      expect(select.querySelectorAll('option')).toHaveLength(7);
    });

    it('renders venue options from query data', () => {
      renderWithProviders(<StationForm {...defaultProps} />);
      expect(screen.getByText('No venue (portable/shared)')).toBeInTheDocument();
      expect(screen.getByText('Grand Hall')).toBeInTheDocument();
      expect(screen.getByText('Garden Terrace')).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      renderWithProviders(<StationForm {...defaultProps} />);
      expect(screen.getByText('Create Station')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onCancel when Cancel clicked', async () => {
      renderWithProviders(<StationForm {...defaultProps} />);
      screen.getByText('Cancel').click();
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('shows error when name is empty on submit', async () => {
      renderWithProviders(<StationForm {...defaultProps} />);
      const form = screen.getByText('Create Station').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('Station name is required')).toBeInTheDocument();
      });
    });

    it('clears field error when user types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<StationForm {...defaultProps} />);
      const form = screen.getByText('Create Station').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText('Station name is required')).toBeInTheDocument();
      });
      await user.type(screen.getByLabelText(/station name/i), 'A');
      expect(screen.queryByText('Station name is required')).not.toBeInTheDocument();
    });

    it('calls mutate with valid data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<StationForm {...defaultProps} />);
      await user.clear(screen.getByLabelText(/station name/i));
      await user.type(screen.getByLabelText(/station name/i), 'Prep Station A');
      const form = screen.getByText('Create Station').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          name: 'Prep Station A',
          type: 'oven',
          capacity: 1,
          venueId: undefined,
          notes: undefined,
        });
      });
    });

    it('submits with venue selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<StationForm {...defaultProps} />);
      await user.type(screen.getByLabelText(/station name/i), 'Grill Station');
      await user.selectOptions(screen.getByLabelText(/venue/i), '1');
      const form = screen.getByText('Create Station').closest('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ venueId: 1 }));
      });
    });
  });

  describe('pending state', () => {
    it('shows Creating... and disables button when pending', () => {
      mockCreateIsPending.value = true;
      renderWithProviders(<StationForm {...defaultProps} />);
      const button = screen.getByText('Creating...');
      expect(button).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('displays submit error from mutation', async () => {
      renderWithProviders(<StationForm {...defaultProps} />);
      act(() => {
        mockCapturedOnError.value?.({ message: 'Duplicate station name' });
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Duplicate station name');
    });
  });

  describe('accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderWithProviders(<StationForm {...defaultProps} />);
      const results = await (await import('../../../test/helpers/axe')).axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
