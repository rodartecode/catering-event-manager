import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from '../../../test/helpers/axe';
import { mockStation, resetMockCounter } from '../../../test/helpers/component-factories';
import { render, screen } from '../../../test/helpers/render';
import { StationCard } from './StationCard';

describe('StationCard', () => {
  const defaultStation = mockStation({
    id: 5,
    name: 'Main Oven',
    type: 'oven',
    capacity: 3,
    notes: 'Recently serviced',
  });

  beforeEach(() => {
    resetMockCounter();
  });

  it('renders station name', () => {
    render(<StationCard station={defaultStation} />);
    expect(screen.getByText('Main Oven')).toBeInTheDocument();
  });

  it('generates correct link href', () => {
    render(<StationCard station={defaultStation} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/kitchen-production/stations/5');
  });

  it('renders station type badge', () => {
    render(<StationCard station={defaultStation} />);
    expect(screen.getByText('Oven')).toBeInTheDocument();
  });

  it('renders capacity with plural text', () => {
    render(<StationCard station={defaultStation} />);
    expect(screen.getByText('Capacity: 3 concurrent tasks')).toBeInTheDocument();
  });

  it('renders singular capacity text', () => {
    const station = mockStation({ capacity: 1 });
    render(<StationCard station={station} />);
    expect(screen.getByText('Capacity: 1 concurrent task')).toBeInTheDocument();
  });

  it('renders venue name when provided', () => {
    render(<StationCard station={defaultStation} venueName="Grand Hall" />);
    expect(screen.getByText('Grand Hall')).toBeInTheDocument();
  });

  it('does not render venue name when not provided', () => {
    render(<StationCard station={defaultStation} />);
    expect(screen.queryByText('Grand Hall')).not.toBeInTheDocument();
  });

  it('renders notes when present', () => {
    render(<StationCard station={defaultStation} />);
    expect(screen.getByText('Recently serviced')).toBeInTheDocument();
  });

  it('does not render notes when null', () => {
    const station = mockStation({ notes: null });
    render(<StationCard station={station} />);
    expect(screen.queryByText('Recently serviced')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<StationCard station={defaultStation} venueName="Grand Hall" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
