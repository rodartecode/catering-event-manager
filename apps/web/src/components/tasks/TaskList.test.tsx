import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/helpers/render';
import { TaskList } from './TaskList';

// Track mock return values so tests can override them
const mockUseQuery = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    task: {
      listByEvent: {
        useQuery: (...args: unknown[]) => mockUseQuery(...args),
      },
    },
    useUtils: () => ({
      task: {
        listByEvent: { invalidate: mockInvalidate },
      },
      event: {
        getById: { invalidate: vi.fn() },
      },
    }),
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Mock child components that have their own tRPC dependencies
vi.mock('./TaskCard', () => ({
  TaskCard: ({
    task,
    isAdmin,
    onEdit,
    onAssign,
    onResources,
  }: {
    task: { id: number; title: string; category: string; status: string };
    isAdmin?: boolean;
    onEdit?: () => void;
    onAssign?: () => void;
    onResources?: () => void;
  }) => (
    <div data-testid={`task-card-${task.id}`}>
      <span>{task.title}</span>
      {isAdmin && (
        <>
          <button type="button" onClick={onEdit}>
            Edit
          </button>
          <button type="button" onClick={onAssign}>
            Assign
          </button>
          <button type="button" onClick={onResources}>
            Resources
          </button>
        </>
      )}
    </div>
  ),
}));

vi.mock('./TaskForm', () => ({
  TaskForm: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="task-form">
      <button type="button" onClick={onClose}>
        Close Form
      </button>
    </div>
  ),
}));

vi.mock('./TaskAssignDialog', () => ({
  TaskAssignDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="task-assign-dialog">
      <button type="button" onClick={onClose}>
        Close Assign
      </button>
    </div>
  ),
}));

vi.mock('@/components/resources/ResourceAssignmentDialog', () => ({
  ResourceAssignmentDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="resource-assignment-dialog">
      <button type="button" onClick={onClose}>
        Close Resources
      </button>
    </div>
  ),
}));

vi.mock('./TaskListSkeleton', () => ({
  TaskListSkeleton: () => <div data-testid="task-list-skeleton">Loading...</div>,
}));

const mockTasks = [
  {
    id: 1,
    eventId: 10,
    title: 'Book venue',
    description: 'Reserve the main hall',
    category: 'pre_event' as const,
    status: 'pending' as const,
    dueDate: new Date('2026-04-10'),
    dependsOnTaskId: null,
    isOverdue: false,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignedTo: null,
    assignee: null,
  },
  {
    id: 2,
    eventId: 10,
    title: 'Serve food',
    description: null,
    category: 'during_event' as const,
    status: 'in_progress' as const,
    dueDate: null,
    dependsOnTaskId: 1,
    isOverdue: false,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignedTo: 1,
    assignee: { id: 1, name: 'Alice', email: 'alice@example.com' },
  },
  {
    id: 3,
    eventId: 10,
    title: 'Send thank-you notes',
    description: null,
    category: 'post_event' as const,
    status: 'completed' as const,
    dueDate: null,
    dependsOnTaskId: null,
    isOverdue: false,
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    assignedTo: null,
    assignee: null,
  },
];

describe('TaskList', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { items: mockTasks },
      isLoading: false,
      error: null,
    });
  });

  it('renders loading skeleton when loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<TaskList eventId={10} />);

    expect(screen.getByTestId('task-list-skeleton')).toBeInTheDocument();
  });

  it('renders error message on error', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to fetch tasks' },
    });

    render(<TaskList eventId={10} />);

    expect(screen.getByText(/error loading tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch tasks/i)).toBeInTheDocument();
  });

  it('renders empty state when no tasks', () => {
    mockUseQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });

    render(<TaskList eventId={10} />);

    expect(screen.getByText('No tasks found')).toBeInTheDocument();
  });

  it('renders "Create First Task" button in empty state for admins', () => {
    mockUseQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });

    render(<TaskList eventId={10} isAdmin={true} />);

    expect(screen.getByText('Create First Task')).toBeInTheDocument();
  });

  it('does not render "Create First Task" button in empty state for non-admins', () => {
    mockUseQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });

    render(<TaskList eventId={10} isAdmin={false} />);

    expect(screen.queryByText('Create First Task')).not.toBeInTheDocument();
  });

  it('renders tasks grouped by category', () => {
    render(<TaskList eventId={10} />);

    expect(screen.getByText('Pre-Event Tasks')).toBeInTheDocument();
    expect(screen.getByText('During Event Tasks')).toBeInTheDocument();
    expect(screen.getByText('Post-Event Tasks')).toBeInTheDocument();
  });

  it('renders task cards for each task', () => {
    render(<TaskList eventId={10} />);

    expect(screen.getByText('Book venue')).toBeInTheDocument();
    expect(screen.getByText('Serve food')).toBeInTheDocument();
    expect(screen.getByText('Send thank-you notes')).toBeInTheDocument();
  });

  it('renders category task counts', () => {
    render(<TaskList eventId={10} />);

    const counts = screen.getAllByText('(1)');
    expect(counts).toHaveLength(3); // each category has 1 task
  });

  it('renders "Add Task" button when isAdmin is true', () => {
    render(<TaskList eventId={10} isAdmin={true} />);

    expect(screen.getByText('Add Task')).toBeInTheDocument();
  });

  it('does not render "Add Task" button when isAdmin is false', () => {
    render(<TaskList eventId={10} isAdmin={false} />);

    expect(screen.queryByText('Add Task')).not.toBeInTheDocument();
  });

  it('renders status filter dropdown', () => {
    render(<TaskList eventId={10} />);

    const statusSelect = screen.getByDisplayValue('All Status');
    expect(statusSelect).toBeInTheDocument();
  });

  it('renders category filter dropdown', () => {
    render(<TaskList eventId={10} />);

    const categorySelect = screen.getByDisplayValue('All Categories');
    expect(categorySelect).toBeInTheDocument();
  });

  it('renders overdue checkbox', () => {
    render(<TaskList eventId={10} />);

    expect(screen.getByLabelText('Overdue only')).toBeInTheDocument();
  });

  it('opens task form when "Add Task" is clicked', async () => {
    render(<TaskList eventId={10} isAdmin={true} />);

    await user.click(screen.getByText('Add Task'));

    expect(screen.getByTestId('task-form')).toBeInTheDocument();
  });

  it('changes status filter', async () => {
    render(<TaskList eventId={10} />);

    const statusSelect = screen.getByDisplayValue('All Status');
    await user.selectOptions(statusSelect, 'pending');

    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
  });

  it('changes category filter', async () => {
    render(<TaskList eventId={10} />);

    const categorySelect = screen.getByDisplayValue('All Categories');
    await user.selectOptions(categorySelect, 'pre_event');

    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ category: 'pre_event' }));
  });

  it('toggles overdue filter', async () => {
    render(<TaskList eventId={10} />);

    const checkbox = screen.getByLabelText('Overdue only');
    await user.click(checkbox);

    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ overdueOnly: true }));
  });
});
