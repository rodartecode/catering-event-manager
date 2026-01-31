import { render, screen } from '../../../test/helpers/render';
import { EventStatusTimeline } from './EventStatusTimeline';

describe('EventStatusTimeline', () => {
  const mockHistoryItem = {
    id: 1,
    oldStatus: null,
    newStatus: 'inquiry' as const,
    changedAt: new Date('2026-01-15T10:30:00Z'),
    changedBy: 'John Doe',
    notes: 'Event created by client request',
  };

  const mockStatusTransition = {
    id: 2,
    oldStatus: 'inquiry' as const,
    newStatus: 'planning' as const,
    changedAt: new Date('2026-01-16T14:15:00Z'),
    changedBy: 'Jane Smith',
    notes: null,
  };

  it('renders empty state when no history', () => {
    render(<EventStatusTimeline history={[]} />);

    expect(screen.getByText('No status changes yet')).toBeInTheDocument();
    expect(screen.getByText('No status changes yet')).toHaveClass('text-gray-500', 'text-sm');
  });

  it('renders single history item without old status', () => {
    render(<EventStatusTimeline history={[mockHistoryItem]} />);

    // Should show new status badge but no arrow or old status
    expect(screen.getByText('Inquiry')).toBeInTheDocument();
    expect(screen.queryByTitle('arrow')).not.toBeInTheDocument();

    // Should show formatted date and time
    expect(screen.getByText(/jan 1[45]/i)).toBeInTheDocument(); // Timezone variance
    expect(screen.getByText(/04:30|10:30/i)).toBeInTheDocument(); // AM/PM variance

    // Should show user attribution
    expect(screen.getByText('by John Doe')).toBeInTheDocument();

    // Should show notes
    expect(screen.getByText('"Event created by client request"')).toBeInTheDocument();
    expect(screen.getByText('"Event created by client request"')).toHaveClass('italic');
  });

  it('renders status transition with arrow', () => {
    render(<EventStatusTimeline history={[mockStatusTransition]} />);

    // Should show both status badges
    expect(screen.getByText('Inquiry')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();

    // Should show arrow between statuses
    const arrow = document.querySelector('svg[stroke="currentColor"]');
    expect(arrow).toBeInTheDocument();
  });

  it('renders multiple history items with timeline connectors', () => {
    const multipleHistory = [mockHistoryItem, mockStatusTransition];
    render(<EventStatusTimeline history={multipleHistory} />);

    // Should show both history items
    expect(screen.getByText('by John Doe')).toBeInTheDocument();
    expect(screen.getByText('by Jane Smith')).toBeInTheDocument();

    // Should show timeline dots (2 items = 2 dots)
    const dots = document.querySelectorAll('.w-4.h-4.rounded-full.bg-blue-600');
    expect(dots).toHaveLength(2);

    // Should show timeline connector (only between items, not after last)
    const connectors = document.querySelectorAll('.absolute.left-2.top-8');
    expect(connectors).toHaveLength(1); // Only one connector between 2 items
  });

  it('renders without user attribution when changedBy is null', () => {
    const historyWithoutUser = {
      ...mockHistoryItem,
      changedBy: null,
    };
    render(<EventStatusTimeline history={[historyWithoutUser]} />);

    // Should not show "by username" text (but notes with "by" are ok)
    expect(screen.queryByText(/by John Doe|by Jane Smith/)).not.toBeInTheDocument();

    // Should still show date and time
    expect(screen.getByText(/jan 1[45]/i)).toBeInTheDocument();
  });

  it('renders without notes when notes is null', () => {
    const historyWithoutNotes = {
      ...mockHistoryItem,
      notes: null,
    };
    render(<EventStatusTimeline history={[historyWithoutNotes]} />);

    // Should not show quoted text
    expect(screen.queryByText(/"/)).not.toBeInTheDocument();

    // Should still show other information
    expect(screen.getByText('Inquiry')).toBeInTheDocument();
    expect(screen.getByText('by John Doe')).toBeInTheDocument();
  });
});