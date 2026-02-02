import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../../test/helpers/axe';
import { fireEvent, render, screen, waitFor } from '../../../test/helpers/render';
import { EventStatusUpdateDialog } from './EventStatusUpdateDialog';

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    event: {
      updateStatus: {
        useMutation: (options: { onSuccess?: () => void }) => {
          return {
            mutate: vi.fn().mockImplementation(() => {
              options.onSuccess?.();
            }),
            isPending: false,
            error: null,
          };
        },
      },
    },
    useUtils: () => ({
      event: {
        getById: { invalidate: vi.fn() },
        list: { invalidate: vi.fn() },
      },
    }),
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

describe('EventStatusUpdateDialog', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const defaultProps = {
    eventId: 1,
    currentStatus: 'planning' as const,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title', () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    expect(screen.getByText('Update Event Status')).toBeInTheDocument();
  });

  it('renders all status options', () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    expect(screen.getByText('Inquiry')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('Preparation')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Follow Up')).toBeInTheDocument();
  });

  it('pre-selects current status', () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    const planningRadio = screen.getByRole('radio', { name: /planning/i });
    expect(planningRadio).toBeChecked();
  });

  it('shows "Current" badge next to current status', () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('renders notes textarea', () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('disables submit button when same status is selected', () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /update status/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when different status is selected', async () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    const inquiryRadio = screen.getByRole('radio', { name: /inquiry/i });
    await user.click(inquiryRadio);

    const submitButton = screen.getByRole('button', { name: /update status/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close icon is clicked', async () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    // Find the close button (X icon) - it's the first button with an SVG
    const closeButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));
    if (closeButton) {
      await user.click(closeButton);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose if same status is submitted', async () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    // Submit without changing status
    const form = screen.getByRole('button', { name: /update status/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('renders status descriptions', () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    expect(screen.getByText(/initial client contact/i)).toBeInTheDocument();
    expect(screen.getByText(/event details being finalized/i)).toBeInTheDocument();
    expect(screen.getByText(/tasks being completed/i)).toBeInTheDocument();
  });

  it('allows selecting a new status', async () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    const inquiryRadio = screen.getByRole('radio', { name: /inquiry/i });
    await user.click(inquiryRadio);

    expect(inquiryRadio).toBeChecked();
  });

  it('allows typing in notes field', async () => {
    render(<EventStatusUpdateDialog {...defaultProps} />);

    const notesField = screen.getByLabelText(/notes/i);
    await user.type(notesField, 'Test note');

    expect(notesField).toHaveValue('Test note');
  });

  describe('accessibility', () => {
    it('has no accessibility violations when open', async () => {
      const { container } = render(<EventStatusUpdateDialog {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has dialog role and aria-modal', () => {
      render(<EventStatusUpdateDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to the title', () => {
      render(<EventStatusUpdateDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const labelId = dialog.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();

      const title = document.getElementById(labelId!);
      expect(title).toHaveTextContent('Update Event Status');
    });
  });
});
