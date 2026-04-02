import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/helpers/render';
import { InvoiceList } from './InvoiceList';

const mockUseQuery = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    invoice: {
      listByEvent: {
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
      },
    },
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Mock InvoiceStatusBadge
vi.mock('./InvoiceStatusBadge', () => ({
  InvoiceStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="invoice-status-badge">{status}</span>
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockInvoices = [
  {
    id: 1,
    invoiceNumber: 'INV-20260401-001',
    status: 'draft',
    total: '2500.00',
    dueDate: new Date('2026-04-15'),
  },
  {
    id: 2,
    invoiceNumber: 'INV-20260401-002',
    status: 'sent',
    total: '1800.50',
    dueDate: null,
  },
  {
    id: 3,
    invoiceNumber: 'INV-20260401-003',
    status: 'paid',
    total: '3200.00',
    dueDate: new Date('2026-03-20'),
  },
];

describe('InvoiceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: mockInvoices,
      isLoading: false,
    });
  });

  it('renders loading skeleton when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(<InvoiceList eventId={5} isAdmin={true} />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no invoices', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    render(<InvoiceList eventId={5} isAdmin={false} />);

    expect(screen.getByText('No invoices yet.')).toBeInTheDocument();
  });

  it('renders empty state when data is null', () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false });

    render(<InvoiceList eventId={5} isAdmin={false} />);

    expect(screen.getByText('No invoices yet.')).toBeInTheDocument();
  });

  it('renders "Create Invoice" link for admins', () => {
    render(<InvoiceList eventId={5} isAdmin={true} />);

    const link = screen.getByText('Create Invoice');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/events/5/invoices/new');
  });

  it('does not render "Create Invoice" link for non-admins', () => {
    render(<InvoiceList eventId={5} isAdmin={false} />);

    expect(screen.queryByText('Create Invoice')).not.toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<InvoiceList eventId={5} isAdmin={false} />);

    expect(screen.getByText('Invoice #')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders invoice numbers', () => {
    render(<InvoiceList eventId={5} isAdmin={false} />);

    expect(screen.getByText('INV-20260401-001')).toBeInTheDocument();
    expect(screen.getByText('INV-20260401-002')).toBeInTheDocument();
    expect(screen.getByText('INV-20260401-003')).toBeInTheDocument();
  });

  it('renders invoice statuses via badge component', () => {
    render(<InvoiceList eventId={5} isAdmin={false} />);

    const badges = screen.getAllByTestId('invoice-status-badge');
    expect(badges).toHaveLength(3);
    expect(badges[0]).toHaveTextContent('draft');
    expect(badges[1]).toHaveTextContent('sent');
    expect(badges[2]).toHaveTextContent('paid');
  });

  it('renders formatted currency totals', () => {
    render(<InvoiceList eventId={5} isAdmin={false} />);

    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('$1,800.50')).toBeInTheDocument();
    expect(screen.getByText('$3,200.00')).toBeInTheDocument();
  });

  it('renders formatted due dates', () => {
    render(<InvoiceList eventId={5} isAdmin={false} />);

    // Invoice with a due date should show formatted date
    const dateCell = screen.getByText(new Date('2026-04-15').toLocaleDateString());
    expect(dateCell).toBeInTheDocument();
  });

  it('renders dash for invoices without due date', () => {
    render(<InvoiceList eventId={5} isAdmin={false} />);

    // INV-002 has no due date, should show '-'
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders View link for each invoice', () => {
    render(<InvoiceList eventId={5} isAdmin={false} />);

    const viewLinks = screen.getAllByText('View');
    expect(viewLinks).toHaveLength(3);

    expect(viewLinks[0].closest('a')).toHaveAttribute('href', '/events/5/invoices/1');
    expect(viewLinks[1].closest('a')).toHaveAttribute('href', '/events/5/invoices/2');
    expect(viewLinks[2].closest('a')).toHaveAttribute('href', '/events/5/invoices/3');
  });

  it('calls useQuery with correct eventId', () => {
    render(<InvoiceList eventId={42} isAdmin={false} />);

    expect(mockUseQuery).toHaveBeenCalledWith({ eventId: 42 });
  });
});
