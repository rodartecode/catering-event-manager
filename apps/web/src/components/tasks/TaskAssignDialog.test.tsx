import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../../test/helpers/axe';
import { render, screen, waitFor } from '../../../test/helpers/render';
import { TaskAssignDialog } from './TaskAssignDialog';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    task: {
      getById: {
        useQuery: () => ({
          data: { id: 1, title: 'Test Task', assignedTo: null, assignee: null },
        }),
      },
      getAssignableUsers: {
        useQuery: () => ({
          data: [
            { id: 1, name: 'Alice Admin', email: 'alice@example.com', role: 'administrator' },
            { id: 2, name: 'Bob Manager', email: 'bob@example.com', role: 'manager' },
          ],
          isLoading: false,
        }),
      },
      assign: {
        useMutation: (options: { onSuccess?: () => void; onError?: (err: Error) => void }) => ({
          mutate: vi.fn().mockImplementation(() => {
            options.onSuccess?.();
          }),
          isPending: false,
        }),
      },
    },
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TaskAssignDialog', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const defaultProps = {
    taskId: 1,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title', () => {
    render(<TaskAssignDialog {...defaultProps} />);

    expect(screen.getByText('Assign Task')).toBeInTheDocument();
  });

  it('renders assignable users', async () => {
    render(<TaskAssignDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.getByText('Bob Manager')).toBeInTheDocument();
    });
  });

  it('renders unassigned option', () => {
    render(<TaskAssignDialog {...defaultProps} />);

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    render(<TaskAssignDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close icon is clicked', async () => {
    render(<TaskAssignDialog {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close dialog/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  describe('accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<TaskAssignDialog {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has dialog role and aria-modal', () => {
      render(<TaskAssignDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to the title', () => {
      render(<TaskAssignDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const labelId = dialog.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();

      const title = document.getElementById(labelId!);
      expect(title).toHaveTextContent('Assign Task');
    });

    it('has accessible close button with aria-label', () => {
      render(<TaskAssignDialog {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close dialog/i });
      expect(closeButton).toBeInTheDocument();
    });
  });
});
