import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskForm } from './TaskForm';

const { mockMutate, mockDeleteMutate, mockCreateIsPending } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockDeleteMutate: vi.fn(),
  mockCreateIsPending: { value: false },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    task: {
      getById: {
        useQuery: vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
      },
      getAvailableDependencies: {
        useQuery: vi.fn().mockReturnValue({
          data: [
            { id: 10, title: 'Setup venue', status: 'pending', category: 'pre_event' },
            { id: 11, title: 'Order supplies', status: 'completed', category: 'pre_event' },
          ],
          isLoading: false,
        }),
      },
      create: {
        useMutation: vi.fn().mockImplementation(() => ({
          mutate: mockMutate,
          isPending: mockCreateIsPending.value,
        })),
      },
      update: {
        useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
      },
      delete: {
        useMutation: vi.fn().mockReturnValue({ mutate: mockDeleteMutate, isPending: false }),
      },
    },
  },
}));

vi.mock('@/hooks/use-focus-trap', () => ({
  useFocusTrap: vi.fn(),
  useDialogId: vi.fn().mockReturnValue('task-dialog-title-1'),
}));

vi.mock('@/hooks/use-form-dirty', () => ({
  useFormDirty: vi.fn().mockReturnValue({ isDirty: false, markClean: vi.fn() }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: createTestWrapper() });
}

describe('TaskForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const defaultProps = {
    eventId: 1,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateIsPending.value = false;
  });

  describe('rendering', () => {
    it('renders the create task dialog title', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Create Task' })).toBeInTheDocument();
    });

    it('renders the edit task dialog title when taskId is provided', () => {
      renderWithProviders(<TaskForm {...defaultProps} taskId={1} />);

      expect(screen.getByRole('heading', { name: 'Edit Task' })).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByText('Title *')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Category *')).toBeInTheDocument();
      expect(screen.getByText('Due Date')).toBeInTheDocument();
      expect(screen.getByText('Depends On')).toBeInTheDocument();
    });

    it('renders title input with placeholder', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByPlaceholderText('Enter task title')).toBeInTheDocument();
    });

    it('renders description textarea with placeholder', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByPlaceholderText('Enter task description')).toBeInTheDocument();
    });

    it('renders category select with three options', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByText('Pre-Event')).toBeInTheDocument();
      expect(screen.getByText('During Event')).toBeInTheDocument();
      expect(screen.getByText('Post-Event')).toBeInTheDocument();
    });

    it('renders dependency select with available tasks', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByText('No dependency')).toBeInTheDocument();
      expect(screen.getByText('Setup venue (pending)')).toBeInTheDocument();
      expect(screen.getByText('Order supplies (completed)')).toBeInTheDocument();
    });

    it('renders dependency help text', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(
        screen.getByText('This task cannot be started until the dependent task is completed.')
      ).toBeInTheDocument();
    });

    it('renders dialog with proper ARIA attributes', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'task-dialog-title-1');
    });
  });

  describe('buttons', () => {
    it('renders Create Task submit button for new tasks', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument();
    });

    it('renders Save Changes submit button for editing', () => {
      renderWithProviders(<TaskForm {...defaultProps} taskId={1} />);

      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders Close dialog button', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    });

    it('renders Delete button only in edit mode', () => {
      renderWithProviders(<TaskForm {...defaultProps} taskId={1} />);

      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('does not render Delete button in create mode', () => {
      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close dialog button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Close dialog' }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('allows typing in the title field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskForm {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter task title');
      await user.type(titleInput, 'New task title');

      expect(titleInput).toHaveValue('New task title');
    });

    it('allows typing in the description field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskForm {...defaultProps} />);

      const descInput = screen.getByPlaceholderText('Enter task description');
      await user.type(descInput, 'Task details');

      expect(descInput).toHaveValue('Task details');
    });

    it('allows selecting a category', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskForm {...defaultProps} />);

      const categorySelect = document.getElementById('category') as HTMLSelectElement;
      await user.selectOptions(categorySelect, 'during_event');

      expect(categorySelect).toHaveValue('during_event');
    });

    it('allows selecting a dependency', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TaskForm {...defaultProps} />);

      const depSelect = document.getElementById('dependsOnTaskId') as HTMLSelectElement;
      await user.selectOptions(depSelect, '10');

      expect(depSelect).toHaveValue('10');
    });
  });

  describe('pending state', () => {
    it('shows Saving... text when mutation is pending', () => {
      mockCreateIsPending.value = true;

      renderWithProviders(<TaskForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    });
  });
});
