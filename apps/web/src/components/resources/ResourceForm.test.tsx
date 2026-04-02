import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceForm } from './ResourceForm';

const { mockMutate, mockCreateIsPending, mockCapturedOnError } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockCreateIsPending: { value: false },
  mockCapturedOnError: { value: undefined as ((error: { message: string }) => void) | undefined },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    resource: {
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

describe('ResourceForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const defaultProps = {
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateIsPending.value = false;
    mockCapturedOnError.value = undefined;
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      renderWithProviders(<ResourceForm {...defaultProps} />);

      expect(screen.getByLabelText(/resource name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/resource type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hourly rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders required field indicators', () => {
      renderWithProviders(<ResourceForm {...defaultProps} />);

      // Resource Name and Resource Type are required
      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers).toHaveLength(2);
    });

    it('renders resource type options', () => {
      renderWithProviders(<ResourceForm {...defaultProps} />);

      expect(screen.getByText('Select a type...')).toBeInTheDocument();
      expect(screen.getByText('Staff')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
      expect(screen.getByText('Materials')).toBeInTheDocument();
    });

    it('renders placeholders', () => {
      renderWithProviders(<ResourceForm {...defaultProps} />);

      expect(
        screen.getByPlaceholderText('e.g., John Smith, Chafing Dish Set, Tablecloths')
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Any additional details about this resource...')
      ).toBeInTheDocument();
    });

    it('renders Create Resource submit button', () => {
      renderWithProviders(<ResourceForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Create Resource' })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      renderWithProviders(<ResourceForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders dollar sign prefix for hourly rate', () => {
      renderWithProviders(<ResourceForm {...defaultProps} />);

      expect(screen.getByText('$')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('allows typing a resource name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      const input = screen.getByLabelText(/resource name/i);
      await user.type(input, 'Head Chef');

      expect(input).toHaveValue('Head Chef');
    });

    it('allows selecting a resource type', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      const select = screen.getByLabelText(/resource type/i);
      await user.selectOptions(select, 'equipment');

      expect(select).toHaveValue('equipment');
    });

    it('allows entering an hourly rate', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      const input = screen.getByLabelText(/hourly rate/i);
      await user.type(input, '35.00');

      expect(input).toHaveValue('35.00');
    });

    it('allows typing notes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      const input = screen.getByLabelText(/notes/i);
      await user.type(input, 'Experienced with large events');

      expect(input).toHaveValue('Experienced with large events');
    });
  });

  describe('validation', () => {
    it('shows error when name is empty on submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/resource type/i), 'staff');
      await user.click(screen.getByRole('button', { name: 'Create Resource' }));

      expect(screen.getByText('Resource name is required')).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('shows error when type is not selected on submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/resource name/i), 'Test Resource');
      await user.click(screen.getByRole('button', { name: 'Create Resource' }));

      expect(screen.getByText('Resource type is required')).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('clears field error when user types in that field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      // Submit with empty name to trigger error
      await user.selectOptions(screen.getByLabelText(/resource type/i), 'staff');
      await user.click(screen.getByRole('button', { name: 'Create Resource' }));
      expect(screen.getByText('Resource name is required')).toBeInTheDocument();

      // Type in name field to clear error
      await user.type(screen.getByLabelText(/resource name/i), 'A');
      expect(screen.queryByText('Resource name is required')).not.toBeInTheDocument();
    });

    it('calls mutate with valid data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/resource name/i), 'Sous Chef');
      await user.selectOptions(screen.getByLabelText(/resource type/i), 'staff');
      await user.type(screen.getByLabelText(/hourly rate/i), '30.00');
      await user.click(screen.getByRole('button', { name: 'Create Resource' }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sous Chef',
          type: 'staff',
          hourlyRate: '30.00',
        })
      );
    });

    it('submits without hourly rate (optional field)', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResourceForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/resource name/i), 'Tablecloths');
      await user.selectOptions(screen.getByLabelText(/resource type/i), 'materials');
      await user.click(screen.getByRole('button', { name: 'Create Resource' }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tablecloths',
          type: 'materials',
        })
      );
    });
  });

  describe('pending state', () => {
    it('shows Creating... text and disables button when mutation is pending', () => {
      mockCreateIsPending.value = true;

      renderWithProviders(<ResourceForm {...defaultProps} />);

      const submitBtn = screen.getByRole('button', { name: 'Creating...' });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('displays submit error message', () => {
      renderWithProviders(<ResourceForm {...defaultProps} />);

      // Simulate error via the onError callback captured during render
      act(() => {
        mockCapturedOnError.value?.({ message: 'Duplicate resource name' });
      });

      expect(screen.getByText('Duplicate resource name')).toBeInTheDocument();
    });
  });
});
