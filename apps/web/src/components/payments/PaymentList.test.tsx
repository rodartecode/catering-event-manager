import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/helpers/render';
import { PaymentList } from './PaymentList';

const mockUseQuery = vi.fn();
const mockMutateFn = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    payment: {
      listByInvoice: {
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
      payment: {
        listByInvoice: { invalidate: vi.fn() },
      },
      invoice: {
        getById: { invalidate: vi.fn() },
      },
    }),
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

const mockPayments = [
  {
    id: 1,
    amount: '1000.00',
    method: 'credit_card',
    reference: 'CC-4242',
    paymentDate: new Date('2026-03-25'),
    notes: null,
  },
  {
    id: 2,
    amount: '500.50',
    method: 'bank_transfer',
    reference: null,
    paymentDate: new Date('2026-03-28'),
    notes: 'Partial payment',
  },
  {
    id: 3,
    amount: '250.00',
    method: 'cash',
    reference: 'RCPT-001',
    paymentDate: new Date('2026-04-01'),
    notes: null,
  },
];

const mockData = {
  payments: mockPayments,
  totalPaid: 1750.5,
  invoiceTotal: 2500,
  remainingBalance: 749.5,
};

describe('PaymentList', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
    });
  });

  it('renders loading skeleton when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(<PaymentList invoiceId={1} isAdmin={true} />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders nothing when data is null', () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false });

    const { container } = render(<PaymentList invoiceId={1} isAdmin={false} />);

    // Should render null — no content
    expect(container.firstChild).toBeNull();
  });

  it('renders payment summary bar with total paid', () => {
    render(<PaymentList invoiceId={1} isAdmin={false} />);

    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('$1,750.50')).toBeInTheDocument();
  });

  it('renders remaining balance', () => {
    render(<PaymentList invoiceId={1} isAdmin={false} />);

    expect(screen.getByText('Remaining')).toBeInTheDocument();
    expect(screen.getByText('$749.50')).toBeInTheDocument();
  });

  it('renders remaining balance in red when balance is positive', () => {
    render(<PaymentList invoiceId={1} isAdmin={false} />);

    const remaining = screen.getByText('$749.50');
    expect(remaining).toHaveClass('text-red-600');
  });

  it('renders remaining balance in green when fully paid', () => {
    mockUseQuery.mockReturnValue({
      data: {
        payments: mockPayments,
        totalPaid: 2500,
        invoiceTotal: 2500,
        remainingBalance: 0,
      },
      isLoading: false,
    });

    render(<PaymentList invoiceId={1} isAdmin={false} />);

    const remaining = screen.getByText('$0.00');
    expect(remaining).toHaveClass('text-green-600');
  });

  it('renders payment table headers', () => {
    render(<PaymentList invoiceId={1} isAdmin={false} />);

    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('renders payment method labels', () => {
    render(<PaymentList invoiceId={1} isAdmin={false} />);

    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
  });

  it('renders payment references and dash for missing ones', () => {
    render(<PaymentList invoiceId={1} isAdmin={false} />);

    expect(screen.getByText('CC-4242')).toBeInTheDocument();
    expect(screen.getByText('RCPT-001')).toBeInTheDocument();
    // Payment 2 has no reference, should show '-'
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders formatted payment amounts', () => {
    render(<PaymentList invoiceId={1} isAdmin={false} />);

    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$500.50')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('renders formatted payment dates', () => {
    render(<PaymentList invoiceId={1} isAdmin={false} />);

    const dateStr = new Date('2026-03-25').toLocaleDateString();
    expect(screen.getByText(dateStr)).toBeInTheDocument();
  });

  it('renders Delete button for admins', () => {
    render(<PaymentList invoiceId={1} isAdmin={true} />);

    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons).toHaveLength(3);
  });

  it('does not render Delete button for non-admins', () => {
    render(<PaymentList invoiceId={1} isAdmin={false} />);

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('calls delete mutation when Delete is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<PaymentList invoiceId={1} isAdmin={true} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockMutateFn).toHaveBeenCalledWith({ id: 1 });

    vi.restoreAllMocks();
  });

  it('does not call delete mutation when Delete is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<PaymentList invoiceId={1} isAdmin={true} />);

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockMutateFn).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('does not render payment table when payments array is empty', () => {
    mockUseQuery.mockReturnValue({
      data: {
        payments: [],
        totalPaid: 0,
        invoiceTotal: 2500,
        remainingBalance: 2500,
      },
      isLoading: false,
    });

    render(<PaymentList invoiceId={1} isAdmin={false} />);

    // Summary should still render
    expect(screen.getByText('Paid')).toBeInTheDocument();
    // But no table headers
    expect(screen.queryByText('Method')).not.toBeInTheDocument();
  });

  it('renders progress bar', () => {
    const { container } = render(<PaymentList invoiceId={1} isAdmin={false} />);

    const progressBar = container.querySelector('.bg-green-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('calls useQuery with correct invoiceId', () => {
    render(<PaymentList invoiceId={42} isAdmin={false} />);

    expect(mockUseQuery).toHaveBeenCalledWith({ invoiceId: 42 });
  });
});
