import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpenseForm } from './ExpenseForm';

const mockMutate = vi.fn();
const mockUpdateMutate = vi.fn();
let mockIsPending = false;
let mockError: { message: string } | null = null;

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: vi.fn().mockReturnValue({
      expense: {
        listByEvent: { invalidate: vi.fn() },
        getEventCostSummary: { invalidate: vi.fn() },
      },
    }),
    expense: {
      create: {
        useMutation: vi.fn().mockImplementation(() => ({
          mutate: mockMutate,
          isPending: mockIsPending,
          error: mockError,
        })),
      },
      update: {
        useMutation: vi.fn().mockImplementation(() => ({
          mutate: mockUpdateMutate,
          isPending: false,
          error: null,
        })),
      },
    },
  },
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

describe('ExpenseForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const defaultProps = {
    eventId: 1,
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
    mockError = null;
  });

  describe('rendering (create mode)', () => {
    it('renders all form fields', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/vendor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders required field indicators', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      // Category, Description, Amount, Date are required
      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers).toHaveLength(4);
    });

    it('renders all category options', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      expect(screen.getByText('Labor')).toBeInTheDocument();
      expect(screen.getByText('Food & Supplies')).toBeInTheDocument();
      expect(screen.getByText('Equipment Rental')).toBeInTheDocument();
      expect(screen.getByText('Venue')).toBeInTheDocument();
      expect(screen.getByText('Transportation')).toBeInTheDocument();
      expect(screen.getByText('Decor')).toBeInTheDocument();
      expect(screen.getByText('Beverages')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('defaults category to Food & Supplies', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      const categorySelect = screen.getByLabelText(/category/i);
      expect(categorySelect).toHaveValue('food_supplies');
    });

    it('renders Add Expense submit button', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Add Expense' })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders amount placeholder', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('defaults expense date to today', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      const dateInput = screen.getByLabelText(/date/i);
      const today = new Date().toISOString().split('T')[0];
      expect(dateInput).toHaveValue(today);
    });
  });

  describe('rendering (edit mode)', () => {
    const editExpense = {
      id: 5,
      category: 'labor',
      description: 'Chef wages',
      amount: '500.00',
      vendor: 'Staffing Agency',
      expenseDate: new Date('2026-03-15'),
      notes: 'For the weekend event',
    };

    it('renders Save Changes button in edit mode', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} expense={editExpense} />);

      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    });

    it('populates form with existing expense data', () => {
      renderWithProviders(<ExpenseForm {...defaultProps} expense={editExpense} />);

      expect(screen.getByLabelText(/category/i)).toHaveValue('labor');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Chef wages');
      expect(screen.getByLabelText(/amount/i)).toHaveValue('500.00');
      expect(screen.getByLabelText(/vendor/i)).toHaveValue('Staffing Agency');
      expect(screen.getByLabelText(/notes/i)).toHaveValue('For the weekend event');
    });
  });

  describe('user interactions', () => {
    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('allows typing a description', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      const input = screen.getByLabelText(/description/i);
      await user.type(input, 'Tablecloths');

      expect(input).toHaveValue('Tablecloths');
    });

    it('allows entering an amount', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      const input = screen.getByLabelText(/amount/i);
      await user.type(input, '250.00');

      expect(input).toHaveValue('250.00');
    });

    it('allows selecting a category', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      const select = screen.getByLabelText(/category/i);
      await user.selectOptions(select, 'venue');

      expect(select).toHaveValue('venue');
    });

    it('allows entering a vendor name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      const input = screen.getByLabelText(/vendor/i);
      await user.type(input, 'Party Supply Co');

      expect(input).toHaveValue('Party Supply Co');
    });
  });

  describe('validation', () => {
    it('shows error when description is empty on submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/amount/i), '100.00');
      await user.click(screen.getByRole('button', { name: 'Add Expense' }));

      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('shows error when amount is invalid on submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/description/i), 'Test');
      await user.click(screen.getByRole('button', { name: 'Add Expense' }));

      expect(screen.getByText('Enter a valid amount (e.g. 100.00)')).toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('clears field error when user types in that field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      // Trigger validation
      await user.type(screen.getByLabelText(/amount/i), '100.00');
      await user.click(screen.getByRole('button', { name: 'Add Expense' }));
      expect(screen.getByText('Description is required')).toBeInTheDocument();

      // Type in the field
      await user.type(screen.getByLabelText(/description/i), 'F');
      expect(screen.queryByText('Description is required')).not.toBeInTheDocument();
    });

    it('calls create mutate with valid data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ExpenseForm {...defaultProps} />);

      await user.type(screen.getByLabelText(/description/i), 'Napkins');
      await user.type(screen.getByLabelText(/amount/i), '25.00');
      await user.click(screen.getByRole('button', { name: 'Add Expense' }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 1,
          category: 'food_supplies',
          description: 'Napkins',
          amount: '25.00',
        })
      );
    });
  });

  describe('pending state', () => {
    it('shows Adding... text when create mutation is pending', () => {
      mockIsPending = true;

      renderWithProviders(<ExpenseForm {...defaultProps} />);

      const submitBtn = screen.getByRole('button', { name: 'Adding...' });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('displays mutation error message', () => {
      mockError = { message: 'Server error' };

      renderWithProviders(<ExpenseForm {...defaultProps} />);

      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
