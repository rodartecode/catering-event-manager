import { render, screen } from '../../../test/helpers/render';
import { AnalyticsCard } from './AnalyticsCard';

describe('AnalyticsCard', () => {
  const mockIcon = (
    <svg viewBox="0 0 24 24" data-testid="mock-icon">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );

  it('renders title and value', () => {
    render(<AnalyticsCard title="Total Events" value={42} />);

    expect(screen.getByText('Total Events')).toBeInTheDocument();
    expect(screen.getByText('Total Events')).toHaveClass('text-sm', 'font-medium', 'text-gray-500');

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('42')).toHaveClass('text-3xl', 'font-semibold', 'text-gray-900');
  });

  it('renders with string value', () => {
    render(<AnalyticsCard title="Success Rate" value="85.4%" />);

    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('85.4%')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <AnalyticsCard title="Total Events" value={42} description="Events completed this month" />
    );

    expect(screen.getByText('Events completed this month')).toBeInTheDocument();
    expect(screen.getByText('Events completed this month')).toHaveClass('text-sm', 'text-gray-600');
  });

  it('does not render description when not provided', () => {
    render(<AnalyticsCard title="Total Events" value={42} />);

    // Should not have description text (more specific than just "events")
    expect(screen.queryByText('Events completed this month')).not.toBeInTheDocument();
  });

  it('renders positive trend correctly', () => {
    render(
      <AnalyticsCard title="Total Events" value={42} trend={{ value: 12.5, isPositive: true }} />
    );

    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('+12.5%')).toHaveClass('text-green-600');
    expect(screen.getByText('vs previous period')).toBeInTheDocument();

    // Should have upward arrow (green) - find SVG by stroke attribute
    const arrow = document.querySelector('svg[stroke="currentColor"]');
    expect(arrow).toBeInTheDocument();
    expect(arrow).toHaveClass('text-green-600');
  });

  it('renders negative trend correctly', () => {
    render(
      <AnalyticsCard title="Total Events" value={42} trend={{ value: -8.3, isPositive: false }} />
    );

    expect(screen.getByText('-8.3%')).toBeInTheDocument();
    expect(screen.getByText('-8.3%')).toHaveClass('text-red-600');

    // Should have downward arrow (red) - find SVG by stroke attribute
    const arrow = document.querySelector('svg[stroke="currentColor"]');
    expect(arrow).toBeInTheDocument();
    expect(arrow).toHaveClass('text-red-600');
  });

  it('does not render trend when not provided', () => {
    render(<AnalyticsCard title="Total Events" value={42} />);

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText('vs previous period')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<AnalyticsCard title="Total Events" value={42} icon={mockIcon} />);

    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();

    const iconContainer = screen.getByTestId('mock-icon').parentElement;
    expect(iconContainer).toHaveClass('bg-blue-50', 'rounded-lg', 'text-blue-600', 'p-3');
  });

  it('does not render icon container when icon not provided', () => {
    render(<AnalyticsCard title="Total Events" value={42} />);

    expect(screen.queryByTestId('mock-icon')).not.toBeInTheDocument();
    expect(document.querySelector('.bg-blue-50')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<AnalyticsCard title="Total Events" value={42} className="custom-class" />);

    const card = screen.getByText('Total Events').closest('.bg-white');
    expect(card).toHaveClass('custom-class');
    // Should also have base classes
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'border', 'border-gray-200', 'p-6');
  });

  it('renders all elements together correctly', () => {
    render(
      <AnalyticsCard
        title="Revenue Growth"
        value="$12,345"
        description="Total revenue this quarter"
        trend={{ value: 15.7, isPositive: true }}
        icon={mockIcon}
        className="highlight"
      />
    );

    expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
    expect(screen.getByText('$12,345')).toBeInTheDocument();
    expect(screen.getByText('Total revenue this quarter')).toBeInTheDocument();
    expect(screen.getByText('+15.7%')).toBeInTheDocument();
    expect(screen.getByText('vs previous period')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();

    const card = screen.getByText('Revenue Growth').closest('.bg-white');
    expect(card).toHaveClass('highlight');
  });
});
