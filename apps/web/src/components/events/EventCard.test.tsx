import { render, screen } from '../../../test/helpers/render';
import { EventCard } from './EventCard';

describe('EventCard', () => {
  const mockEvent = {
    id: 1,
    eventName: 'Wedding Reception',
    clientName: 'John Smith',
    eventDate: new Date('2026-03-15'),
    status: 'planning' as const,
    taskCount: 10,
    completedTaskCount: 3,
  };

  it('renders event name', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('Wedding Reception')).toBeInTheDocument();
  });

  it('renders client name', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders "Unknown Client" when clientName is null', () => {
    render(<EventCard event={{ ...mockEvent, clientName: null }} />);

    expect(screen.getByText('Unknown Client')).toBeInTheDocument();
  });

  it('renders formatted event date', () => {
    render(<EventCard event={mockEvent} />);

    // Check for the date format pattern (month, day, year) regardless of exact date
    // (timezone differences may cause the displayed date to vary by 1 day)
    expect(screen.getByText(/march 1[45], 2026/i)).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('links to event detail page', () => {
    render(<EventCard event={mockEvent} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/events/1');
  });

  it('renders task progress when taskCount > 0', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('renders progress bar with correct width', () => {
    const { container } = render(<EventCard event={mockEvent} />);

    // 3/10 = 30%
    const progressBar = container.querySelector('[style*="width: 30%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('does not render task progress when taskCount is 0', () => {
    render(<EventCard event={{ ...mockEvent, taskCount: 0, completedTaskCount: 0 }} />);

    expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
  });

  it('handles 100% task completion', () => {
    const { container } = render(
      <EventCard event={{ ...mockEvent, taskCount: 5, completedTaskCount: 5 }} />
    );

    expect(screen.getByText('5/5')).toBeInTheDocument();
    const progressBar = container.querySelector('[style*="width: 100%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it.each([
    ['inquiry', 'Inquiry'],
    ['planning', 'Planning'],
    ['preparation', 'Preparation'],
    ['in_progress', 'In Progress'],
    ['completed', 'Completed'],
    ['follow_up', 'Follow Up'],
  ] as const)('renders %s status correctly', (status, label) => {
    render(<EventCard event={{ ...mockEvent, status }} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
