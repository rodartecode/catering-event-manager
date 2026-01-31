import { render, screen } from '../../../test/helpers/render';
import { OverdueIndicator } from './OverdueIndicator';

describe('OverdueIndicator', () => {
  it('renders nothing when not overdue', () => {
    const { container } = render(<OverdueIndicator isOverdue={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders "Overdue" text when overdue without date', () => {
    render(<OverdueIndicator isOverdue={true} />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('renders with formatted date when provided', () => {
    render(<OverdueIndicator isOverdue={true} dueDate={new Date('2026-01-15')} />);

    // Check for the overdue text with date
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/jan 1[45]/i)).toBeInTheDocument(); // Timezone variance
  });

  it('renders with red styling', () => {
    render(<OverdueIndicator isOverdue={true} />);

    const indicator = screen.getByText('Overdue');
    expect(indicator).toHaveClass('bg-red-100');
    expect(indicator).toHaveClass('text-red-800');
  });

  it('renders warning icon', () => {
    const { container } = render(<OverdueIndicator isOverdue={true} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders nothing when overdue is false even with date', () => {
    const { container } = render(
      <OverdueIndicator isOverdue={false} dueDate={new Date('2026-01-15')} />
    );

    expect(container.firstChild).toBeNull();
  });
});
