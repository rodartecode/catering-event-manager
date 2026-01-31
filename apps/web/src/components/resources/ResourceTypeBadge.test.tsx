import { render, screen } from '../../../test/helpers/render';
import { ResourceTypeBadge } from './ResourceTypeBadge';

describe('ResourceTypeBadge', () => {
  it.each([
    ['staff', 'Staff', 'bg-purple-100', 'text-purple-800'],
    ['equipment', 'Equipment', 'bg-blue-100', 'text-blue-800'],
    ['materials', 'Materials', 'bg-green-100', 'text-green-800'],
  ] as const)(
    'renders %s type with label "%s" and classes "%s %s"',
    (type, expectedLabel, expectedBgClass, expectedTextClass) => {
      render(<ResourceTypeBadge type={type} />);

      const badge = screen.getByText(expectedLabel);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(expectedBgClass);
      expect(badge).toHaveClass(expectedTextClass);
    }
  );

  it('renders with correct base styling', () => {
    render(<ResourceTypeBadge type="staff" />);

    const badge = screen.getByText('Staff');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
  });
});
