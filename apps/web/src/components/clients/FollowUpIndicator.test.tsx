import { render, screen } from '../../../test/helpers/render';
import { FollowUpIndicator } from './FollowUpIndicator';

describe('FollowUpIndicator', () => {
  beforeEach(() => {
    // Mock the current date to 2026-01-15 for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when followUpDate is null', () => {
    const { container } = render(
      <FollowUpIndicator followUpDate={null} followUpCompleted={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders completed state correctly', () => {
    render(
      <FollowUpIndicator
        followUpDate={new Date('2026-01-10T10:00:00Z')}
        followUpCompleted={true}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toHaveClass('bg-green-100', 'text-green-800');

    // Should have checkmark icon
    const checkIcon = document.querySelector('svg[stroke="currentColor"]');
    expect(checkIcon).toBeInTheDocument();
  });

  it('renders overdue state correctly', () => {
    // 3 days overdue (followUp was Jan 12, today is Jan 15)
    render(
      <FollowUpIndicator
        followUpDate={new Date('2026-01-12T10:00:00Z')}
        followUpCompleted={false}
      />
    );

    expect(screen.getByText('3 days overdue')).toBeInTheDocument();
    expect(screen.getByText('3 days overdue')).toHaveClass('bg-red-100', 'text-red-800');

    // Should have warning icon
    const warningIcon = document.querySelector('svg[stroke="currentColor"]');
    expect(warningIcon).toBeInTheDocument();
  });

  it('renders singular overdue correctly', () => {
    // 1 day overdue (followUp was Jan 14, today is Jan 15)
    render(
      <FollowUpIndicator
        followUpDate={new Date('2026-01-14T10:00:00Z')}
        followUpCompleted={false}
      />
    );

    expect(screen.getByText('1 day overdue')).toBeInTheDocument();
  });

  it('renders due today state correctly', () => {
    // Due today (followUp is Jan 15, today is Jan 15)
    render(
      <FollowUpIndicator
        followUpDate={new Date('2026-01-15T14:00:00Z')}
        followUpCompleted={false}
      />
    );

    expect(screen.getByText('Due today')).toBeInTheDocument();
    expect(screen.getByText('Due today')).toHaveClass('bg-amber-100', 'text-amber-900');

    // Should have clock icon
    const clockIcon = document.querySelector('svg[stroke="currentColor"]');
    expect(clockIcon).toBeInTheDocument();
  });

  it('renders future date state correctly', () => {
    // Future date (followUp is Jan 20, today is Jan 15)
    render(
      <FollowUpIndicator
        followUpDate={new Date('2026-01-20T10:00:00Z')}
        followUpCompleted={false}
      />
    );

    expect(screen.getByText(/jan 20/i)).toBeInTheDocument();
    const futureText = screen.getByText(/jan 20/i);
    expect(futureText).toHaveClass('bg-blue-100', 'text-blue-800');

    // Should have calendar icon
    const calendarIcon = document.querySelector('svg[stroke="currentColor"]');
    expect(calendarIcon).toBeInTheDocument();
  });

  it('ignores time when calculating date differences', () => {
    // Same date but different times should be "due today"
    render(
      <FollowUpIndicator
        followUpDate={new Date('2026-01-15T23:59:59Z')}
        followUpCompleted={false}
      />
    );

    expect(screen.getByText('Due today')).toBeInTheDocument();
  });

  it('completed state overrides date calculation', () => {
    // Even if overdue, completed should show completed state
    render(
      <FollowUpIndicator
        followUpDate={new Date('2026-01-10T10:00:00Z')}
        followUpCompleted={true}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
  });
});