import { render, screen } from '../../../test/helpers/render';
import { VendorCard } from './VendorCard';

describe('VendorCard', () => {
  const mockVendor = {
    id: 1,
    companyName: 'Bloom & Stem Florals',
    contactName: 'Jane Doe',
    email: 'jane@bloom.com',
    phone: '555-1212',
    serviceType: 'florals' as const,
  };

  const mockMinimal = {
    id: 2,
    companyName: 'Acme Rentals',
    contactName: null,
    email: null,
    phone: null,
    serviceType: 'rentals' as const,
  };

  it('renders company name as heading', () => {
    render(<VendorCard vendor={mockVendor} />);
    expect(screen.getByText('Bloom & Stem Florals')).toBeInTheDocument();
  });

  it('links to vendor detail page', () => {
    render(<VendorCard vendor={mockVendor} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/vendors/1');
  });

  it('renders service type badge with human label', () => {
    render(<VendorCard vendor={mockVendor} />);
    expect(screen.getByText('Florals')).toBeInTheDocument();
  });

  it('renders contact details when present', () => {
    render(<VendorCard vendor={mockVendor} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@bloom.com')).toBeInTheDocument();
    expect(screen.getByText('555-1212')).toBeInTheDocument();
  });

  it('omits contact details when null', () => {
    render(<VendorCard vendor={mockMinimal} />);
    expect(screen.queryByText('jane@bloom.com')).not.toBeInTheDocument();
  });

  it('shows assigned events count when greater than zero', () => {
    render(<VendorCard vendor={mockVendor} assignedEventCount={3} />);
    expect(screen.getByText('3 assigned events')).toBeInTheDocument();
  });

  it('uses singular form for one event', () => {
    render(<VendorCard vendor={mockVendor} assignedEventCount={1} />);
    expect(screen.getByText('1 assigned event')).toBeInTheDocument();
  });

  it('hides count when zero', () => {
    render(<VendorCard vendor={mockVendor} />);
    expect(screen.queryByText(/assigned event/)).not.toBeInTheDocument();
  });
});
