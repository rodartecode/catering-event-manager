import { describe, expect, it } from 'vitest';
import { axe } from '../../../test/helpers/axe';
import { render, screen } from '../../../test/helpers/render';
import { StationTypeBadge } from './StationTypeBadge';

describe('StationTypeBadge', () => {
  it.each([
    ['oven', 'Oven'],
    ['grill', 'Grill'],
    ['prep_counter', 'Prep Counter'],
    ['cold_storage', 'Cold Storage'],
    ['stovetop', 'Stovetop'],
    ['fryer', 'Fryer'],
    ['mixer', 'Mixer'],
  ])('renders "%s" as "%s"', (type, label) => {
    render(<StationTypeBadge type={type} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to raw type string for unknown types', () => {
    render(<StationTypeBadge type="wok" />);
    expect(screen.getByText('wok')).toBeInTheDocument();
  });

  it('applies gray styling for unknown types', () => {
    render(<StationTypeBadge type="unknown" />);
    const badge = screen.getByText('unknown');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-800');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StationTypeBadge type="oven" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
