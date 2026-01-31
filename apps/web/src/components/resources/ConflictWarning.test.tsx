import { render, screen } from '../../../test/helpers/render';
import { userEvent } from '@testing-library/user-event';
import { ConflictWarning } from './ConflictWarning';

describe('ConflictWarning', () => {
  const mockConflict = {
    resourceId: 1,
    resourceName: 'Chef John',
    conflictingEventId: 2,
    conflictingEventName: 'Corporate Lunch',
    conflictingTaskId: 3,
    conflictingTaskTitle: 'Food Preparation',
    existingStartTime: new Date('2026-01-15T10:00:00Z'),
    existingEndTime: new Date('2026-01-15T14:00:00Z'),
    requestedStartTime: new Date('2026-01-15T12:00:00Z'),
    requestedEndTime: new Date('2026-01-15T16:00:00Z'),
    message: 'Overlapping time conflict detected',
  };

  const mockConflictWithoutTask = {
    ...mockConflict,
    conflictingTaskId: undefined,
    conflictingTaskTitle: undefined,
  };

  it('returns null when no conflicts', () => {
    const { container } = render(<ConflictWarning conflicts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders single conflict correctly', () => {
    render(<ConflictWarning conflicts={[mockConflict]} />);

    // Should show singular heading
    expect(screen.getByText('Scheduling Conflict Detected')).toBeInTheDocument();

    // Should show resource and event names
    expect(screen.getByText('Chef John')).toBeInTheDocument();
    expect(screen.getByText('Corporate Lunch')).toBeInTheDocument();

    // Should show task title (in parentheses)
    expect(screen.getByText(/Food Preparation/)).toBeInTheDocument();

    // Should show time ranges
    expect(screen.getByText(/existing:/i)).toBeInTheDocument();
    expect(screen.getByText(/requested:/i)).toBeInTheDocument();

    // Should show warning icon
    const warningIcon = document.querySelector('svg[stroke="currentColor"]');
    expect(warningIcon).toBeInTheDocument();

    // Should have yellow styling on the main container
    const container = screen.getByText('Scheduling Conflict Detected').closest('.bg-yellow-50');
    expect(container).toHaveClass('bg-yellow-50', 'border-yellow-200');
  });

  it('renders multiple conflicts with plural heading', () => {
    const multipleConflicts = [mockConflict, { ...mockConflict, resourceId: 2, resourceName: 'Chef Mary' }];
    render(<ConflictWarning conflicts={multipleConflicts} />);

    // Should show plural heading
    expect(screen.getByText('Scheduling Conflicts Detected')).toBeInTheDocument();

    // Should show both resource names
    expect(screen.getByText('Chef John')).toBeInTheDocument();
    expect(screen.getByText('Chef Mary')).toBeInTheDocument();
  });

  it('renders conflict without task title', () => {
    render(<ConflictWarning conflicts={[mockConflictWithoutTask]} />);

    // Should show resource and event names
    expect(screen.getByText('Chef John')).toBeInTheDocument();
    expect(screen.getByText('Corporate Lunch')).toBeInTheDocument();

    // Should NOT show parentheses or task title
    expect(screen.queryByText('(Food Preparation)')).not.toBeInTheDocument();
    expect(screen.queryByText('Food Preparation')).not.toBeInTheDocument();
  });

  it('formats time ranges correctly', () => {
    render(<ConflictWarning conflicts={[mockConflict]} />);

    // Should format times (allowing for timezone variance)
    const timeText = screen.getByText(/existing:/i).textContent;
    expect(timeText).toMatch(/jan 1[45]/i); // Date variance
    expect(timeText).toMatch(/10:00|2:00/i); // Time variance (AM/PM)

    const requestedText = screen.getByText(/requested:/i).textContent;
    expect(requestedText).toMatch(/12:00|4:00/i); // Start time
    expect(requestedText).toMatch(/16:00|4:00/i); // End time
  });

  it('renders dismiss button when onDismiss provided', () => {
    const onDismiss = vi.fn();
    render(<ConflictWarning conflicts={[mockConflict]} onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button');
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton).toHaveClass('text-yellow-500', 'hover:text-yellow-600');

    // Should have accessibility label
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ConflictWarning conflicts={[mockConflict]} onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not render dismiss button when onDismiss not provided', () => {
    render(<ConflictWarning conflicts={[mockConflict]} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
  });
});