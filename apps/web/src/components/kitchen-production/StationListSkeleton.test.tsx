import { describe, expect, it } from 'vitest';
import { axe } from '../../../test/helpers/axe';
import { render } from '../../../test/helpers/render';
import { StationListSkeleton } from './StationListSkeleton';

describe('StationListSkeleton', () => {
  it('renders 6 skeleton cards', () => {
    const { container } = render(<StationListSkeleton />);
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards).toHaveLength(6);
  });

  it('renders as a grid layout', () => {
    const { container } = render(<StationListSkeleton />);
    const grid = container.firstElementChild;
    expect(grid?.className).toContain('grid');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StationListSkeleton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
