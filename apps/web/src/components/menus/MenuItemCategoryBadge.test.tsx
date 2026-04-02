import { render, screen } from '../../../test/helpers/render';
import { MenuItemCategoryBadge } from './MenuItemCategoryBadge';

describe('MenuItemCategoryBadge', () => {
  it.each([
    ['appetizer', 'Appetizer', 'bg-amber-100'],
    ['main', 'Main', 'bg-blue-100'],
    ['side', 'Side', 'bg-green-100'],
    ['dessert', 'Dessert', 'bg-pink-100'],
    ['beverage', 'Beverage', 'bg-cyan-100'],
  ] as const)('renders %s category with label "%s" and class "%s"', (category, expectedLabel, expectedClass) => {
    render(<MenuItemCategoryBadge category={category} />);

    const badge = screen.getByText(expectedLabel);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(expectedClass);
  });

  it('falls back to raw category string for unknown categories', () => {
    render(<MenuItemCategoryBadge category="snack" />);

    const badge = screen.getByText('snack');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100');
    expect(badge).toHaveClass('text-gray-800');
  });

  it('renders with correct base styling', () => {
    render(<MenuItemCategoryBadge category="main" />);

    const badge = screen.getByText('Main');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
    expect(badge).toHaveClass('border');
  });
});
