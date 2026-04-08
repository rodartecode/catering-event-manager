import { describe, expect, it } from 'vitest';
import { axe } from '../../../test/helpers/axe';
import { render, screen } from '../../../test/helpers/render';
import { PrepTypeBadge } from './PrepTypeBadge';

describe('PrepTypeBadge', () => {
  it.each([
    ['marinate', 'Marinate'],
    ['bake', 'Bake'],
    ['grill', 'Grill'],
    ['plate', 'Plate'],
    ['chop', 'Chop'],
    ['mix', 'Mix'],
    ['chill', 'Chill'],
    ['fry', 'Fry'],
    ['assemble', 'Assemble'],
    ['garnish', 'Garnish'],
  ])('renders "%s" as "%s"', (type, label) => {
    render(<PrepTypeBadge type={type} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to raw type string for unknown types', () => {
    render(<PrepTypeBadge type="smoke" />);
    expect(screen.getByText('smoke')).toBeInTheDocument();
  });

  it('applies gray styling for unknown types', () => {
    render(<PrepTypeBadge type="unknown" />);
    const badge = screen.getByText('unknown');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-800');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PrepTypeBadge type="grill" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
