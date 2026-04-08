import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../../test/helpers/axe';
import { mockProductionTask, resetMockCounter } from '../../../test/helpers/component-factories';
import { render, screen } from '../../../test/helpers/render';
import { ProductionTaskCard } from './ProductionTaskCard';

describe('ProductionTaskCard', () => {
  const mockOnStatusChange = vi.fn();

  const defaultTask = mockProductionTask({
    id: 10,
    name: 'Marinate chicken',
    prepType: 'marinate',
    status: 'pending',
    durationMinutes: 45,
    offsetMinutes: -240,
    scheduledStart: null,
    servings: 50,
    notes: 'Use lemon juice',
  });

  const defaultProps = {
    task: defaultTask,
    stationName: 'Main Oven',
    assignedToName: 'Chef John',
    onStatusChange: mockOnStatusChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockCounter();
  });

  describe('rendering', () => {
    it('renders task name', () => {
      render(<ProductionTaskCard {...defaultProps} />);
      expect(screen.getByText('Marinate chicken')).toBeInTheDocument();
    });

    it('renders prep type badge', () => {
      render(<ProductionTaskCard {...defaultProps} />);
      expect(screen.getByText('Marinate')).toBeInTheDocument();
    });

    it('renders duration', () => {
      render(<ProductionTaskCard {...defaultProps} />);
      expect(screen.getByText('45min')).toBeInTheDocument();
    });

    it('renders station name when provided', () => {
      render(<ProductionTaskCard {...defaultProps} />);
      expect(screen.getByText('Station: Main Oven')).toBeInTheDocument();
    });

    it('renders assigned name when provided', () => {
      render(<ProductionTaskCard {...defaultProps} />);
      expect(screen.getByText('Assigned: Chef John')).toBeInTheDocument();
    });

    it('renders servings when provided', () => {
      render(<ProductionTaskCard {...defaultProps} />);
      expect(screen.getByText('Servings: 50')).toBeInTheDocument();
    });

    it('renders notes when provided', () => {
      render(<ProductionTaskCard {...defaultProps} />);
      expect(screen.getByText('Use lemon juice')).toBeInTheDocument();
    });

    it('does not render station when not provided', () => {
      render(<ProductionTaskCard {...defaultProps} stationName={undefined} />);
      expect(screen.queryByText(/Station:/)).not.toBeInTheDocument();
    });

    it('does not render assigned when not provided', () => {
      render(<ProductionTaskCard {...defaultProps} assignedToName={undefined} />);
      expect(screen.queryByText(/Assigned:/)).not.toBeInTheDocument();
    });

    it('does not render servings when null', () => {
      const task = mockProductionTask({ servings: null });
      render(<ProductionTaskCard task={task} />);
      expect(screen.queryByText(/Servings:/)).not.toBeInTheDocument();
    });

    it('does not render notes when null', () => {
      const task = mockProductionTask({ notes: null });
      render(<ProductionTaskCard task={task} />);
      expect(screen.queryByText('Use lemon juice')).not.toBeInTheDocument();
    });
  });

  describe('status badge', () => {
    it.each([
      ['pending', 'Pending'],
      ['in_progress', 'In Progress'],
      ['completed', 'Done'],
      ['skipped', 'Skipped'],
    ] as const)('renders "%s" status as "%s"', (status, label) => {
      const task = mockProductionTask({ status });
      render(<ProductionTaskCard task={task} onStatusChange={mockOnStatusChange} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('falls back to Pending for unknown status', () => {
      const task = mockProductionTask({ status: 'unknown_status' });
      render(<ProductionTaskCard task={task} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('offset formatting', () => {
    it('formats hours-only offset', () => {
      const task = mockProductionTask({ offsetMinutes: -240 });
      render(<ProductionTaskCard task={task} />);
      expect(screen.getByText('4h before')).toBeInTheDocument();
    });

    it('formats hours and minutes offset', () => {
      const task = mockProductionTask({ offsetMinutes: -270 });
      render(<ProductionTaskCard task={task} />);
      expect(screen.getByText('4h 30m before')).toBeInTheDocument();
    });

    it('formats minute-only offset', () => {
      const task = mockProductionTask({ offsetMinutes: -45 });
      render(<ProductionTaskCard task={task} />);
      expect(screen.getByText('45m before')).toBeInTheDocument();
    });

    it('formats multi-day offset', () => {
      const task = mockProductionTask({ offsetMinutes: -2880 });
      render(<ProductionTaskCard task={task} />);
      expect(screen.getByText('2d before')).toBeInTheDocument();
    });

    it('formats day and hours offset', () => {
      const task = mockProductionTask({ offsetMinutes: -1560 });
      render(<ProductionTaskCard task={task} />);
      expect(screen.getByText('1d 2h before')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('shows Start and Skip buttons for pending task', () => {
      render(<ProductionTaskCard {...defaultProps} />);
      expect(screen.getByText('Start')).toBeInTheDocument();
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });

    it('shows Complete and Skip buttons for in_progress task', () => {
      const task = mockProductionTask({ status: 'in_progress' });
      render(<ProductionTaskCard task={task} onStatusChange={mockOnStatusChange} />);
      expect(screen.getByText('Complete')).toBeInTheDocument();
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });

    it('does not show action buttons for completed task', () => {
      const task = mockProductionTask({ status: 'completed' });
      render(<ProductionTaskCard task={task} onStatusChange={mockOnStatusChange} />);
      expect(screen.queryByText('Start')).not.toBeInTheDocument();
      expect(screen.queryByText('Complete')).not.toBeInTheDocument();
      expect(screen.queryByText('Skip')).not.toBeInTheDocument();
    });

    it('does not show action buttons for skipped task', () => {
      const task = mockProductionTask({ status: 'skipped' });
      render(<ProductionTaskCard task={task} onStatusChange={mockOnStatusChange} />);
      expect(screen.queryByText('Start')).not.toBeInTheDocument();
      expect(screen.queryByText('Complete')).not.toBeInTheDocument();
      expect(screen.queryByText('Skip')).not.toBeInTheDocument();
    });

    it('does not show action buttons when onStatusChange not provided', () => {
      render(<ProductionTaskCard task={defaultTask} />);
      expect(screen.queryByText('Start')).not.toBeInTheDocument();
      expect(screen.queryByText('Skip')).not.toBeInTheDocument();
    });

    it('calls onStatusChange with in_progress when Start clicked', async () => {
      render(<ProductionTaskCard {...defaultProps} />);
      screen.getByText('Start').click();
      expect(mockOnStatusChange).toHaveBeenCalledWith(10, 'in_progress');
    });

    it('calls onStatusChange with completed when Complete clicked', async () => {
      const task = mockProductionTask({ id: 20, status: 'in_progress' });
      render(<ProductionTaskCard task={task} onStatusChange={mockOnStatusChange} />);
      screen.getByText('Complete').click();
      expect(mockOnStatusChange).toHaveBeenCalledWith(20, 'completed');
    });

    it('calls onStatusChange with skipped when Skip clicked', async () => {
      render(<ProductionTaskCard {...defaultProps} />);
      screen.getByText('Skip').click();
      expect(mockOnStatusChange).toHaveBeenCalledWith(10, 'skipped');
    });
  });

  describe('accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<ProductionTaskCard {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
