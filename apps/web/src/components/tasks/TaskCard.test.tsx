import { render, screen } from '../../../test/helpers/render';
import userEvent from '@testing-library/user-event';
import { TaskCard } from './TaskCard';
import { vi } from 'vitest';

// Mock the child components that use tRPC
vi.mock('./TaskStatusButton', () => ({
  TaskStatusButton: ({ taskId, currentStatus }: { taskId: number; currentStatus: string }) => (
    <button data-testid="task-status-button">
      Status: {currentStatus}
    </button>
  ),
}));

describe('TaskCard', () => {
  const user = userEvent.setup();

  const mockTask = {
    id: 1,
    title: 'Setup venue',
    description: 'Set up tables and chairs at the venue',
    category: 'pre_event' as const,
    status: 'pending' as const,
    dueDate: new Date('2026-03-15'),
    isOverdue: false,
    dependsOnTaskId: null,
    assignee: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    },
    resourceCount: 3,
  };

  it('renders task title', () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByText('Setup venue')).toBeInTheDocument();
  });

  it('renders task description', () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByText('Set up tables and chairs at the venue')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders category badge', () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByText('Pre-Event')).toBeInTheDocument();
  });

  it('renders formatted due date', () => {
    render(<TaskCard task={mockTask} />);

    // Timezone-safe check
    expect(screen.getByText(/mar 1[45], 2026/i)).toBeInTheDocument();
  });

  it('renders assignee name', () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders resource count', () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByText('3 resources')).toBeInTheDocument();
  });

  it('renders singular resource for count of 1', () => {
    render(<TaskCard task={{ ...mockTask, resourceCount: 1 }} />);

    expect(screen.getByText('1 resource')).toBeInTheDocument();
  });

  it('does not render resource count when undefined', () => {
    const { resourceCount, ...taskWithoutResources } = mockTask;
    render(<TaskCard task={taskWithoutResources} />);

    expect(screen.queryByText(/resource/i)).not.toBeInTheDocument();
  });

  it('does not render resource count when zero', () => {
    render(<TaskCard task={{ ...mockTask, resourceCount: 0 }} />);

    expect(screen.queryByText(/resource/i)).not.toBeInTheDocument();
  });

  it('renders dependency indicator when task has dependency', () => {
    render(<TaskCard task={{ ...mockTask, dependsOnTaskId: 2 }} />);

    expect(screen.getByText('Has dependency')).toBeInTheDocument();
  });

  it('does not render dependency indicator when no dependency', () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.queryByText('Has dependency')).not.toBeInTheDocument();
  });

  it('renders overdue indicator when task is overdue', () => {
    render(<TaskCard task={{ ...mockTask, isOverdue: true }} />);

    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  it('does not render description when null', () => {
    render(<TaskCard task={{ ...mockTask, description: null }} />);

    expect(screen.queryByText('Set up tables and chairs')).not.toBeInTheDocument();
  });

  it('does not render due date when null', () => {
    render(<TaskCard task={{ ...mockTask, dueDate: null }} />);

    expect(screen.queryByText(/mar/i)).not.toBeInTheDocument();
  });

  it('does not render assignee when null', () => {
    render(<TaskCard task={{ ...mockTask, assignee: null }} />);

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('shows action buttons when showActions is true and isAdmin is true', () => {
    render(
      <TaskCard
        task={mockTask}
        showActions={true}
        isAdmin={true}
        onEdit={() => {}}
        onAssign={() => {}}
        onResources={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resources/i })).toBeInTheDocument();
  });

  it('hides admin buttons when isAdmin is false', () => {
    render(
      <TaskCard
        task={mockTask}
        showActions={true}
        isAdmin={false}
        onEdit={() => {}}
        onAssign={() => {}}
        onResources={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resources/i })).not.toBeInTheDocument();
  });

  it('calls onEdit when Edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<TaskCard task={mockTask} isAdmin={true} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalled();
  });

  it('calls onAssign when Assign button is clicked', async () => {
    const onAssign = vi.fn();
    render(<TaskCard task={mockTask} isAdmin={true} onAssign={onAssign} />);

    await user.click(screen.getByRole('button', { name: /assign/i }));

    expect(onAssign).toHaveBeenCalled();
  });

  it('calls onResources when Resources button is clicked', async () => {
    const onResources = vi.fn();
    render(<TaskCard task={mockTask} isAdmin={true} onResources={onResources} />);

    await user.click(screen.getByRole('button', { name: /resources/i }));

    expect(onResources).toHaveBeenCalled();
  });

  it('renders status button', () => {
    render(<TaskCard task={mockTask} />);

    expect(screen.getByTestId('task-status-button')).toBeInTheDocument();
  });
});
