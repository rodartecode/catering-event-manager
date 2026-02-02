import { render, screen } from '../../../test/helpers/render';
import { TaskStatusBadge } from './TaskStatusBadge';

describe('TaskStatusBadge', () => {
  it.each([
    ['pending', 'Pending', 'bg-gray-100'],
    ['in_progress', 'In Progress', 'bg-blue-100'],
    ['completed', 'Completed', 'bg-green-100'],
  ] as const)('renders %s status with label "%s" and class "%s"', (status, expectedLabel, expectedClass) => {
    render(<TaskStatusBadge status={status} />);

    const badge = screen.getByText(expectedLabel);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(expectedClass);
  });

  it('renders with correct base styling', () => {
    render(<TaskStatusBadge status="pending" />);

    const badge = screen.getByText('Pending');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
  });
});
