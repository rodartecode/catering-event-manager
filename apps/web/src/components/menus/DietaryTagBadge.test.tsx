import { render, screen } from '../../../test/helpers/render';
import { DietaryTagBadge } from './DietaryTagBadge';

describe('DietaryTagBadge', () => {
  it.each([
    ['vegan', 'Vegan', 'bg-green-100'],
    ['vegetarian', 'Vegetarian', 'bg-emerald-100'],
    ['gluten_free', 'Gluten Free', 'bg-amber-100'],
    ['halal', 'Halal', 'bg-blue-100'],
    ['kosher', 'Kosher', 'bg-purple-100'],
    ['dairy_free', 'Dairy Free', 'bg-orange-100'],
    ['nut_free', 'Nut Free', 'bg-red-100'],
  ] as const)('renders %s tag with label "%s" and class "%s"', (tag, expectedLabel, expectedClass) => {
    render(<DietaryTagBadge tag={tag} />);

    const badge = screen.getByText(expectedLabel);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(expectedClass);
  });

  it('falls back to raw tag string for unknown tags', () => {
    render(<DietaryTagBadge tag="organic" />);

    const badge = screen.getByText('organic');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-800');
  });

  it('renders with correct base styling', () => {
    render(<DietaryTagBadge tag="vegan" />);

    const badge = screen.getByText('Vegan');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
    expect(badge).toHaveClass('border');
  });
});
