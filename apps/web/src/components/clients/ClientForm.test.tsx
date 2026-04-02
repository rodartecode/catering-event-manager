import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientForm } from './ClientForm';

const { mockMutate, mockCreateIsPending } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockCreateIsPending: { value: false },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    clients: {
      create: {
        useMutation: vi.fn().mockImplementation(() => ({
          mutate: mockMutate,
          isPending: mockCreateIsPending.value,
        })),
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

describe('ClientForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const defaultProps = {
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateIsPending.value = false;
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      renderWithProviders(<ClientForm {...defaultProps} />);

      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders required field indicators', () => {
      renderWithProviders(<ClientForm {...defaultProps} />);

      // Company Name, Contact Name, Email are required (marked with *)
      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers).toHaveLength(3);
    });

    it('renders placeholders for all fields', () => {
      renderWithProviders(<ClientForm {...defaultProps} />);

      expect(screen.getByPlaceholderText('e.g., Acme Corporation')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., John Smith')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., john@acme.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., (555) 123-4567')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('e.g., 123 Main St, Suite 100, New York, NY 10001')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Any additional details about this client...')
      ).toBeInTheDocument();
    });

    it('renders Create Client submit button', () => {
      renderWithProviders(<ClientForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Create Client' })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      renderWithProviders(<ClientForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('allows typing in company name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      const input = screen.getByLabelText(/company name/i);
      await user.type(input, 'Acme Corp');

      expect(input).toHaveValue('Acme Corp');
    });

    it('allows typing in contact name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      const input = screen.getByLabelText(/contact name/i);
      await user.type(input, 'Jane Doe');

      expect(input).toHaveValue('Jane Doe');
    });

    it('allows typing in email field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      const input = screen.getByLabelText(/email/i);
      await user.type(input, 'jane@acme.com');

      expect(input).toHaveValue('jane@acme.com');
    });

    it('allows typing in phone field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      const input = screen.getByLabelText(/phone/i);
      await user.type(input, '555-1234');

      expect(input).toHaveValue('555-1234');
    });

    it('allows typing in address field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      const input = screen.getByLabelText(/address/i);
      await user.type(input, '123 Main St');

      expect(input).toHaveValue('123 Main St');
    });

    it('allows typing in notes field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      const input = screen.getByLabelText(/notes/i);
      await user.type(input, 'VIP client');

      expect(input).toHaveValue('VIP client');
    });
  });

  describe('validation', () => {
    it('shows validation errors when submitting empty required fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Create Client' }));

      await waitFor(() => {
        expect(screen.getByText('Company name is required')).toBeInTheDocument();
        expect(screen.getByText('Contact name is required')).toBeInTheDocument();
        // Empty email triggers both min(1) and .email() — last error wins
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('shows email validation error for invalid email', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/company name/i), 'Acme');
      await user.type(screen.getByLabelText(/contact name/i), 'John');
      await user.type(screen.getByLabelText(/email/i), 'not-an-email');

      const form = screen.getByRole('button', { name: 'Create Client' }).closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('clears field error when user types in that field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      // Submit to trigger validation
      await user.click(screen.getByRole('button', { name: 'Create Client' }));
      expect(screen.getByText('Company name is required')).toBeInTheDocument();

      // Type in the field to clear the error
      await user.type(screen.getByLabelText(/company name/i), 'A');
      expect(screen.queryByText('Company name is required')).not.toBeInTheDocument();
    });

    it('calls mutate with valid data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ClientForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/company name/i), 'Acme Corp');
      await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@acme.com');
      await user.click(screen.getByRole('button', { name: 'Create Client' }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Acme Corp',
          contactName: 'John Doe',
          email: 'john@acme.com',
        })
      );
    });
  });

  describe('pending state', () => {
    it('shows Creating... text and disables button when mutation is pending', () => {
      mockCreateIsPending.value = true;

      renderWithProviders(<ClientForm {...defaultProps} />);

      const submitBtn = screen.getByRole('button', { name: 'Creating...' });
      expect(submitBtn).toBeDisabled();
    });
  });
});
