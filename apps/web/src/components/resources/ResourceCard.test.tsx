import { render, screen } from '../../../test/helpers/render';
import { ResourceCard } from './ResourceCard';

describe('ResourceCard', () => {
  const mockResource = {
    id: 1,
    name: 'Chef John',
    type: 'staff' as const,
    hourlyRate: '45.00',
    isAvailable: true,
    notes: 'Experienced chef specializing in French cuisine with 15 years of experience',
    upcomingAssignments: 3,
  };

  const mockResourceMinimal = {
    id: 2,
    name: 'Mixing Bowl',
    type: 'equipment' as const,
    hourlyRate: null,
    isAvailable: false,
    notes: null,
  };

  it('renders resource name and type badge', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('Chef John')).toBeInTheDocument();
    expect(screen.getByText('Chef John')).toHaveClass('text-xl', 'font-semibold');

    // ResourceTypeBadge should be rendered (exact text depends on implementation)
    expect(screen.getByText('Staff')).toBeInTheDocument();
  });

  it('generates correct link href', () => {
    render(<ResourceCard resource={mockResource} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/resources/1');
  });

  it('renders availability indicator correctly', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('Available')).toBeInTheDocument();

    // Should have green dot
    const dot = document.querySelector('.bg-green-500');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('w-2', 'h-2', 'rounded-full');
  });

  it('renders unavailable status correctly', () => {
    render(<ResourceCard resource={mockResourceMinimal} />);

    expect(screen.getByText('Unavailable')).toBeInTheDocument();

    // Should have red dot
    const dot = document.querySelector('.bg-red-500');
    expect(dot).toBeInTheDocument();
  });

  it('renders hourly rate with icon when provided', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('$45.00/hr')).toBeInTheDocument();

    // Should have dollar icon
    const dollarIcon = document.querySelector('svg[stroke="currentColor"]');
    expect(dollarIcon).toBeInTheDocument();
  });

  it('does not render hourly rate when null', () => {
    render(<ResourceCard resource={mockResourceMinimal} />);

    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/hr/)).not.toBeInTheDocument();
  });

  it('renders notes with line-clamp when provided', () => {
    render(<ResourceCard resource={mockResource} />);

    const notesText = 'Experienced chef specializing in French cuisine with 15 years of experience';
    expect(screen.getByText(notesText)).toBeInTheDocument();
    expect(screen.getByText(notesText)).toHaveClass('line-clamp-2');

    // Should have notes icon
    const icons = document.querySelectorAll('svg[stroke="currentColor"]');
    expect(icons.length).toBeGreaterThan(1); // Multiple icons (dollar + notes)
  });

  it('does not render notes section when null', () => {
    render(<ResourceCard resource={mockResourceMinimal} />);

    // Should not find the specific notes text
    expect(screen.queryByText(/experienced chef/i)).not.toBeInTheDocument();
  });

  it('renders upcoming assignments with correct pluralization', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('3 upcoming assignments')).toBeInTheDocument();

    // Should have calendar icon
    const calendarIcon = document.querySelector('svg[viewBox="0 0 24 24"]');
    expect(calendarIcon).toBeInTheDocument();
  });

  it('renders singular assignment correctly', () => {
    const resourceWithOneAssignment = {
      ...mockResource,
      upcomingAssignments: 1,
    };
    render(<ResourceCard resource={resourceWithOneAssignment} />);

    expect(screen.getByText('1 upcoming assignment')).toBeInTheDocument();
  });

  it('does not render assignments section when zero', () => {
    const resourceWithNoAssignments = {
      ...mockResource,
      upcomingAssignments: 0,
    };
    render(<ResourceCard resource={resourceWithNoAssignments} />);

    expect(screen.queryByText(/upcoming assignment/)).not.toBeInTheDocument();
  });

  it('does not render assignments section when undefined', () => {
    const resourceWithoutAssignments = {
      ...mockResource,
      upcomingAssignments: undefined,
    };
    render(<ResourceCard resource={resourceWithoutAssignments} />);

    expect(screen.queryByText(/upcoming assignment/)).not.toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<ResourceCard resource={mockResource} />);

    const link = screen.getByRole('link');
    expect(link).toHaveClass('block', 'group');

    const card = link.firstChild;
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'hover:shadow-lg', 'transition-shadow', 'p-6', 'h-full');

    const title = screen.getByText('Chef John');
    expect(title).toHaveClass('group-hover:text-blue-600', 'transition');
  });
});