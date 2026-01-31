import { render, screen } from '../../../test/helpers/render';
import { ClientCard } from './ClientCard';

describe('ClientCard', () => {
  const mockClient = {
    id: 1,
    companyName: 'Acme Corporation',
    contactName: 'John Smith',
    email: 'john.smith@acmecorp.com',
    phone: '+1 (555) 123-4567',
  };

  const mockClientWithoutPhone = {
    id: 2,
    companyName: 'Beta Industries',
    contactName: 'Jane Doe',
    email: 'jane.doe@betaindustries.com',
    phone: null,
  };

  it('renders company name as heading', () => {
    render(<ClientCard client={mockClient} />);

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Acme Corporation')).toHaveClass('text-xl', 'font-semibold');
  });

  it('generates correct link href', () => {
    render(<ClientCard client={mockClient} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/clients/1');
  });

  it('renders contact information with icons', () => {
    render(<ClientCard client={mockClient} />);

    // Contact name
    expect(screen.getByText('John Smith')).toBeInTheDocument();

    // Email with truncation class
    const emailElement = screen.getByText('john.smith@acmecorp.com');
    expect(emailElement).toBeInTheDocument();
    expect(emailElement).toHaveClass('truncate');

    // Phone
    expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument();

    // Should have 3 icons (person, email, phone)
    const icons = document.querySelectorAll('svg[stroke="currentColor"]');
    expect(icons.length).toBeGreaterThanOrEqual(3);
  });

  it('does not render phone when null', () => {
    render(<ClientCard client={mockClientWithoutPhone} />);

    expect(screen.queryByText(/555/)).not.toBeInTheDocument();

    // Should have 2 icons (person, email) but not phone
    const icons = document.querySelectorAll('svg[stroke="currentColor"]');
    expect(icons.length).toBeLessThan(3);
  });

  it('renders events count badge when greater than zero', () => {
    render(<ClientCard client={mockClient} eventsCount={5} />);

    expect(screen.getByText('5 events')).toBeInTheDocument();

    const badge = screen.getByText('5 events');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800', 'rounded-full');
  });

  it('renders singular event correctly', () => {
    render(<ClientCard client={mockClient} eventsCount={1} />);

    expect(screen.getByText('1 event')).toBeInTheDocument();
  });

  it('does not render events badge when count is zero', () => {
    render(<ClientCard client={mockClient} eventsCount={0} />);

    expect(screen.queryByText(/event/)).not.toBeInTheDocument();
  });

  it('defaults to zero events when eventsCount not provided', () => {
    render(<ClientCard client={mockClient} />);

    expect(screen.queryByText(/event/)).not.toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<ClientCard client={mockClient} />);

    const link = screen.getByRole('link');
    expect(link).toHaveClass('block', 'group');

    const card = link.firstChild;
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'hover:shadow-lg', 'transition-shadow', 'p-6', 'h-full');

    const title = screen.getByText('Acme Corporation');
    expect(title).toHaveClass('group-hover:text-blue-600', 'transition');
  });
});