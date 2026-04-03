import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/helpers/render';
import { ExpenseList } from './ExpenseList';

const mockUseQuery = vi.fn();
const mockMutateFn = vi.fn();
const mockInvalidateList = vi.fn();
const mockInvalidateSummary = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    expense: {
      listByEvent: {
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
      },
      delete: {
        useMutation: (options: { onSuccess?: () => void }) => ({
          mutate: (...args: unknown[]) => {
            mockMutateFn(...args);
            options.onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      expense: {
        listByEvent: { invalidate: mockInvalidateList },
        getEventCostSummary: { invalidate: mockInvalidateSummary },
      },
    }),
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Mock ExpenseForm
vi.mock('./ExpenseForm', () => ({
  ExpenseForm: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => (
    <div data-testid="expense-form">
      <button type="button" onClick={onSuccess}>
        Save
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

const mockExpenses = [
  {
    id: 1,
    category: 'labor',
    description: 'Chef wages',
    amount: '1200.00',
    vendor: 'Staff Agency',
    expenseDate: new Date('2026-03-20'),
    notes: null,
  },
  {
    id: 2,
    category: 'food_supplies',
    description: 'Fresh produce',
    amount: '350.75',
    vendor: null,
    expenseDate: new Date('2026-03-21'),
    notes: 'Organic vegetables',
  },
  {
    id: 3,
    category: 'equipment_rental',
    description: 'Chafing dishes',
    amount: '200.00',
    vendor: 'Party Rentals Co',
    expenseDate: new Date('2026-03-22'),
    notes: null,
  },
];

describe('ExpenseList', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: mockExpenses,
      isLoading: false,
    });
  });

  it('renders loading skeleton when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(<ExpenseList eventId={5} isAdmin={true} />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no expenses', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.getByText('No expenses recorded yet.')).toBeInTheDocument();
  });

  it('renders empty state when data is null', () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false });

    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.getByText('No expenses recorded yet.')).toBeInTheDocument();
  });

  it('renders "Add Expense" button for admins', () => {
    render(<ExpenseList eventId={5} isAdmin={true} />);

    expect(screen.getByText('Add Expense')).toBeInTheDocument();
  });

  it('does not render "Add Expense" button for non-admins', () => {
    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.queryByText('Add Expense')).not.toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('renders Actions header for admins', () => {
    render(<ExpenseList eventId={5} isAdmin={true} />);

    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('does not render Actions header for non-admins', () => {
    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });

  it('renders expense descriptions', () => {
    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.getByText('Chef wages')).toBeInTheDocument();
    expect(screen.getByText('Fresh produce')).toBeInTheDocument();
    expect(screen.getByText('Chafing dishes')).toBeInTheDocument();
  });

  it('renders formatted currency amounts', () => {
    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('$350.75')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('renders category badges with labels', () => {
    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.getByText('Labor')).toBeInTheDocument();
    expect(screen.getByText('Food & Supplies')).toBeInTheDocument();
    expect(screen.getByText('Equipment')).toBeInTheDocument();
  });

  it('renders vendor names and dash for missing vendors', () => {
    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.getByText('Staff Agency')).toBeInTheDocument();
    expect(screen.getByText('Party Rentals Co')).toBeInTheDocument();
    // Expense 2 has no vendor, should show '-'
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders formatted expense dates', () => {
    render(<ExpenseList eventId={5} isAdmin={false} />);

    const dateStr = new Date('2026-03-20').toLocaleDateString();
    expect(screen.getByText(dateStr)).toBeInTheDocument();
  });

  it('renders Edit and Delete buttons for admins', () => {
    render(<ExpenseList eventId={5} isAdmin={true} />);

    const editButtons = screen.getAllByText('Edit');
    const deleteButtons = screen.getAllByText('Delete');

    expect(editButtons).toHaveLength(3);
    expect(deleteButtons).toHaveLength(3);
  });

  it('does not render Edit and Delete buttons for non-admins', () => {
    render(<ExpenseList eventId={5} isAdmin={false} />);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('opens expense form when "Add Expense" is clicked', async () => {
    render(<ExpenseList eventId={5} isAdmin={true} />);

    await user.click(screen.getByText('Add Expense'));

    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
    expect(screen.getByText('New Expense')).toBeInTheDocument();
  });

  it('hides "Add Expense" button while form is open', async () => {
    render(<ExpenseList eventId={5} isAdmin={true} />);

    await user.click(screen.getByText('Add Expense'));

    expect(screen.queryByText('Add Expense')).not.toBeInTheDocument();
  });

  it('opens edit form when Edit button is clicked', async () => {
    render(<ExpenseList eventId={5} isAdmin={true} />);

    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    expect(screen.getByText('Edit Expense')).toBeInTheDocument();
    expect(screen.getByTestId('expense-form')).toBeInTheDocument();
  });

  it('calls delete mutation when Delete is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ExpenseList eventId={5} isAdmin={true} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockMutateFn).toHaveBeenCalledWith({ id: 1 });

    vi.restoreAllMocks();
  });

  it('does not call delete mutation when Delete is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<ExpenseList eventId={5} isAdmin={true} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockMutateFn).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('calls useQuery with correct eventId', () => {
    render(<ExpenseList eventId={42} isAdmin={false} />);

    expect(mockUseQuery).toHaveBeenCalledWith({ eventId: 42 });
  });
});
