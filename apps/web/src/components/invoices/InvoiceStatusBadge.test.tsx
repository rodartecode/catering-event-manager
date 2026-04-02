import { render, screen } from '../../../test/helpers/render';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

describe('InvoiceStatusBadge', () => {
  it.each([
    ['draft', 'Draft', 'bg-gray-100'],
    ['sent', 'Sent', 'bg-blue-100'],
    ['paid', 'Paid', 'bg-green-100'],
    ['overdue', 'Overdue', 'bg-red-100'],
    ['cancelled', 'Cancelled', 'bg-yellow-100'],
  ] as const)('renders %s status with label "%s" and class "%s"', (status, expectedLabel, expectedClass) => {
    render(<InvoiceStatusBadge status={status} />);

    const badge = screen.getByText(expectedLabel);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(expectedClass);
  });

  it('falls back to draft styling for unknown statuses', () => {
    render(<InvoiceStatusBadge status="unknown_status" />);

    const badge = screen.getByText('Draft');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-800');
  });

  it('renders with correct base styling', () => {
    render(<InvoiceStatusBadge status="paid" />);

    const badge = screen.getByText('Paid');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
    expect(badge).toHaveClass('border');
  });
});
