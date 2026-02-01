import { render, screen } from '../../../test/helpers/render';
import { EventStatusBadge } from './EventStatusBadge';

describe('EventStatusBadge', () => {
  it.each([
    ['inquiry', 'Inquiry', 'bg-purple-100'],
    ['planning', 'Planning', 'bg-blue-100'],
    ['preparation', 'Preparation', 'bg-amber-100'],
    ['in_progress', 'In Progress', 'bg-orange-100'],
    ['completed', 'Completed', 'bg-green-100'],
    ['follow_up', 'Follow Up', 'bg-gray-100'],
  ] as const)(
    'renders %s status with label "%s" and class "%s"',
    (status, expectedLabel, expectedClass) => {
      render(<EventStatusBadge status={status} />);

      const badge = screen.getByText(expectedLabel);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(expectedClass);
    }
  );

  it('renders with correct base styling', () => {
    render(<EventStatusBadge status="inquiry" />);

    const badge = screen.getByText('Inquiry');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
  });
});
