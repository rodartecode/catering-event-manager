import { render, screen, waitFor } from '../../../test/helpers/render';
import userEvent from '@testing-library/user-event';
import { ResourceAssignmentDialog } from './ResourceAssignmentDialog';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe } from '../../../test/helpers/axe';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    resource: {
      getAvailable: {
        useQuery: () => ({
          data: [
            { id: 1, name: 'Chef John', type: 'staff', hourlyRate: '25.00' },
            { id: 2, name: 'Catering Van', type: 'equipment', hourlyRate: '50.00' },
            { id: 3, name: 'Table Linens', type: 'materials', hourlyRate: null },
          ],
          isLoading: false,
        }),
      },
      checkConflicts: {
        useQuery: () => ({
          data: { hasConflicts: false, conflicts: [] },
          isLoading: false,
        }),
      },
    },
    task: {
      assignResources: {
        useMutation: (options: { onSuccess?: () => void }) => ({
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

describe('ResourceAssignmentDialog', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    taskId: 1,
    eventId: 1,
    startTime: new Date('2026-02-15T10:00:00'),
    endTime: new Date('2026-02-15T14:00:00'),
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title', () => {
    render(<ResourceAssignmentDialog {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Assign Resources' })).toBeInTheDocument();
  });

  it('renders available resources', async () => {
    render(<ResourceAssignmentDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Chef John')).toBeInTheDocument();
      expect(screen.getByText('Catering Van')).toBeInTheDocument();
      expect(screen.getByText('Table Linens')).toBeInTheDocument();
    });
  });

  it('renders filter buttons', () => {
    render(<ResourceAssignmentDialog {...defaultProps} />);

    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /staff/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /equipment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /materials/i })).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    render(<ResourceAssignmentDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close icon is clicked', async () => {
    render(<ResourceAssignmentDialog {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close dialog/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<ResourceAssignmentDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Assign Resources')).not.toBeInTheDocument();
  });

  it('shows selected count when resources are selected', async () => {
    render(<ResourceAssignmentDialog {...defaultProps} />);

    // Click on first resource (it's a checkbox)
    const resourceButtons = screen.getAllByRole('checkbox');
    await user.click(resourceButtons[0]);

    expect(screen.getByText('1 resource selected')).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('has no accessibility violations when open', async () => {
      const { container } = render(<ResourceAssignmentDialog {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has dialog role and aria-modal', () => {
      render(<ResourceAssignmentDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to the title', () => {
      render(<ResourceAssignmentDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const labelId = dialog.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();

      const title = document.getElementById(labelId!);
      expect(title).toHaveTextContent('Assign Resources');
    });

    it('has accessible close button with aria-label', () => {
      render(<ResourceAssignmentDialog {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close dialog/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('resource items use checkbox role with aria-checked', async () => {
      render(<ResourceAssignmentDialog {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // First checkbox should be unchecked initially
      expect(checkboxes[0]).toHaveAttribute('aria-checked', 'false');

      // Click to select
      await user.click(checkboxes[0]);

      // Now should be checked
      expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
    });
  });
});
