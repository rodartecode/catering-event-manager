import { render, screen } from '../../../test/helpers/render';
import { TaskCategoryBadge } from './TaskCategoryBadge';

describe('TaskCategoryBadge', () => {
  it.each([
    ['pre_event', 'Pre-Event', 'bg-purple-100', 'text-purple-800'],
    ['during_event', 'During Event', 'bg-orange-100', 'text-orange-800'],
    ['post_event', 'Post-Event', 'bg-teal-100', 'text-teal-800'],
  ] as const)(
    'renders %s category with label "%s" and classes "%s %s"',
    (category, expectedLabel, expectedBgClass, expectedTextClass) => {
      render(<TaskCategoryBadge category={category} />);

      const badge = screen.getByText(expectedLabel);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(expectedBgClass);
      expect(badge).toHaveClass(expectedTextClass);
    }
  );

  it('renders with correct base styling', () => {
    render(<TaskCategoryBadge category="pre_event" />);

    const badge = screen.getByText('Pre-Event');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
  });
});
