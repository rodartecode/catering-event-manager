import { render, screen } from '../../../test/helpers/render';
import { VenueCard } from './VenueCard';

describe('VenueCard', () => {
  const mockVenue = {
    id: 1,
    name: 'Grand Ballroom',
    address: '123 Main St, Downtown',
    capacity: 200,
    hasKitchen: true,
    equipmentAvailable: ['oven', 'grill', 'refrigerator'],
  };

  const mockVenueMinimal = {
    id: 2,
    name: 'Garden Terrace',
    address: '456 Oak Ave',
    capacity: null,
    hasKitchen: false,
    equipmentAvailable: null,
  };

  it('renders venue name as heading', () => {
    render(<VenueCard venue={mockVenue} />);
    expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
  });

  it('generates correct link href', () => {
    render(<VenueCard venue={mockVenue} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/venues/1');
  });

  it('renders address', () => {
    render(<VenueCard venue={mockVenue} />);
    expect(screen.getByText('123 Main St, Downtown')).toBeInTheDocument();
  });

  it('renders capacity when present', () => {
    render(<VenueCard venue={mockVenue} />);
    expect(screen.getByText('Capacity: 200')).toBeInTheDocument();
  });

  it('does not render capacity when null', () => {
    render(<VenueCard venue={mockVenueMinimal} />);
    expect(screen.queryByText(/Capacity/)).not.toBeInTheDocument();
  });

  it('renders kitchen badge when hasKitchen is true', () => {
    render(<VenueCard venue={mockVenue} />);
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
  });

  it('does not render kitchen badge when hasKitchen is false', () => {
    render(<VenueCard venue={mockVenueMinimal} />);
    expect(screen.queryByText('Kitchen')).not.toBeInTheDocument();
  });

  it('renders equipment count', () => {
    render(<VenueCard venue={mockVenue} />);
    expect(screen.getByText('3 equipment items')).toBeInTheDocument();
  });

  it('renders singular equipment item', () => {
    render(<VenueCard venue={{ ...mockVenue, equipmentAvailable: ['oven'] }} />);
    expect(screen.getByText('1 equipment item')).toBeInTheDocument();
  });

  it('does not render equipment count when empty', () => {
    render(<VenueCard venue={mockVenueMinimal} />);
    expect(screen.queryByText(/equipment/)).not.toBeInTheDocument();
  });

  it('renders events count badge', () => {
    render(<VenueCard venue={mockVenue} eventsCount={3} />);
    expect(screen.getByText('3 events')).toBeInTheDocument();
  });

  it('has correct styling', () => {
    render(<VenueCard venue={mockVenue} />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('block', 'group');
  });
});
