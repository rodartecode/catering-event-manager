import { render, screen } from '../../../test/helpers/render';
import { userEvent } from '@testing-library/user-event';
import { Sidebar } from './Sidebar';

// Mock Next.js navigation hooks
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock UserMenu component
vi.mock('./UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu">User Menu</div>,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('renders logo and navigation items', () => {
    render(<Sidebar />);

    // Logo
    expect(screen.getByText('Catering Manager')).toBeInTheDocument();
    expect(screen.getByText('Catering Manager')).toHaveAttribute('href', '/');

    // Navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs', () => {
    render(<Sidebar />);

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/');

    const eventsLink = screen.getByRole('link', { name: /events/i });
    expect(eventsLink).toHaveAttribute('href', '/events');

    const clientsLink = screen.getByRole('link', { name: /clients/i });
    expect(clientsLink).toHaveAttribute('href', '/clients');

    const resourcesLink = screen.getByRole('link', { name: /resources/i });
    expect(resourcesLink).toHaveAttribute('href', '/resources');

    const analyticsLink = screen.getByRole('link', { name: /analytics/i });
    expect(analyticsLink).toHaveAttribute('href', '/analytics');
  });

  it('shows dashboard as active when pathname is "/"', () => {
    mockUsePathname.mockReturnValue('/');
    render(<Sidebar />);

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveClass('bg-gray-800', 'border-l-4', 'border-blue-500', 'ml-[-2px]');

    const eventsLink = screen.getByRole('link', { name: /events/i });
    expect(eventsLink).toHaveClass('hover:bg-gray-800');
    expect(eventsLink).not.toHaveClass('bg-gray-800');
  });

  it('shows events as active when pathname starts with "/events"', () => {
    mockUsePathname.mockReturnValue('/events/123');
    render(<Sidebar />);

    const eventsLink = screen.getByRole('link', { name: /events/i });
    expect(eventsLink).toHaveClass('bg-gray-800', 'border-l-4', 'border-blue-500', 'ml-[-2px]');

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).not.toHaveClass('bg-gray-800');
  });

  it('shows clients as active when pathname starts with "/clients"', () => {
    mockUsePathname.mockReturnValue('/clients/new');
    render(<Sidebar />);

    const clientsLink = screen.getByRole('link', { name: /clients/i });
    expect(clientsLink).toHaveClass('bg-gray-800', 'border-l-4', 'border-blue-500');
  });

  it('renders mobile close button when onClose provided', () => {
    const onClose = vi.fn();
    render(<Sidebar onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close menu' });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveClass('lg:hidden', 'p-1', 'rounded', 'hover:bg-gray-800');

    // Should have X icon
    const closeIcon = closeButton.querySelector('svg');
    expect(closeIcon).toBeInTheDocument();
  });

  it('does not render close button when onClose not provided', () => {
    render(<Sidebar />);

    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Sidebar onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when navigation link clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Sidebar onClose={onClose} />);

    await user.click(screen.getByRole('link', { name: /events/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders UserMenu component', () => {
    render(<Sidebar />);

    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<Sidebar />);

    // Find the main sidebar container (parent of the header section)
    const sidebar = screen.getByText('Catering Manager').closest('.bg-gray-900');
    expect(sidebar).toHaveClass('flex', 'flex-col', 'h-full', 'w-64', 'bg-gray-900', 'text-white');
  });

  it('renders navigation icons', () => {
    render(<Sidebar />);

    // Should have multiple SVG icons (5 nav items + potentially close button)
    const icons = document.querySelectorAll('svg[stroke="currentColor"]');
    expect(icons.length).toBeGreaterThanOrEqual(5);
  });
});