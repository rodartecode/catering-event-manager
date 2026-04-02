import { render, screen } from '../../../test/helpers/render';
import { DocumentTypeBadge } from './DocumentTypeBadge';

describe('DocumentTypeBadge', () => {
  it.each([
    ['contract', 'Contract', 'bg-blue-100'],
    ['menu', 'Menu', 'bg-green-100'],
    ['floor_plan', 'Floor Plan', 'bg-purple-100'],
    ['permit', 'Permit', 'bg-amber-100'],
    ['photo', 'Photo', 'bg-pink-100'],
  ] as const)('renders %s type with label "%s" and class "%s"', (type, expectedLabel, expectedClass) => {
    render(<DocumentTypeBadge type={type} />);

    const badge = screen.getByText(expectedLabel);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(expectedClass);
  });

  it('falls back to raw type string for unknown types', () => {
    render(<DocumentTypeBadge type="invoice" />);

    const badge = screen.getByText('invoice');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-800');
  });

  it('renders with correct base styling', () => {
    render(<DocumentTypeBadge type="contract" />);

    const badge = screen.getByText('Contract');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
    expect(badge).toHaveClass('border');
  });
});
