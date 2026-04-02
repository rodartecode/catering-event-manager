import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../test/helpers/render';
import { BatchStatusDialog } from './BatchStatusDialog';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
  },
}));

describe('BatchStatusDialog', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];
  const defaultProps = {
    count: 5,
    entityLabel: 'event',
    statusOptions,
    onSubmit: mockOnSubmit,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it('renders dialog with title', () => {
    render(<BatchStatusDialog {...defaultProps} />);
    expect(screen.getByText('Batch Update Status')).toBeInTheDocument();
  });

  it('has dialog role and aria-modal', () => {
    render(<BatchStatusDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-labelledby pointing to the title', () => {
    render(<BatchStatusDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const title = document.getElementById(labelId!);
    expect(title).toHaveTextContent('Batch Update Status');
  });

  it('displays count and entity label in description', () => {
    render(<BatchStatusDialog {...defaultProps} />);
    expect(screen.getByText(/apply a new status to 5 selected events/i)).toBeInTheDocument();
  });

  it('uses singular form for count of 1', () => {
    render(<BatchStatusDialog {...defaultProps} count={1} />);
    expect(screen.getByText(/apply a new status to 1 selected event\./i)).toBeInTheDocument();
  });

  it('renders all status options as radio buttons', () => {
    render(<BatchStatusDialog {...defaultProps} />);
    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('pre-selects the first status option', () => {
    render(<BatchStatusDialog {...defaultProps} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();
  });

  it('renders notes textarea', () => {
    render(<BatchStatusDialog {...defaultProps} />);
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    render(<BatchStatusDialog {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close icon button is clicked', async () => {
    render(<BatchStatusDialog {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('allows selecting a different status', async () => {
    render(<BatchStatusDialog {...defaultProps} />);

    const completedRadio = screen.getByRole('radio', { name: /completed/i });
    await user.click(completedRadio);

    expect(completedRadio).toBeChecked();
  });

  it('allows typing notes', async () => {
    render(<BatchStatusDialog {...defaultProps} />);
    const textarea = screen.getByLabelText(/notes/i);
    await user.type(textarea, 'Bulk update reason');
    expect(textarea).toHaveValue('Bulk update reason');
  });

  it('submits with selected status and notes', async () => {
    render(<BatchStatusDialog {...defaultProps} />);

    const completedRadio = screen.getByRole('radio', { name: /completed/i });
    await user.click(completedRadio);
    await user.type(screen.getByLabelText(/notes/i), 'All done');

    const form = screen.getByRole('button', { name: /apply to/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('completed', 'All done');
    });
  });

  it('submits with undefined notes when notes field is empty', async () => {
    render(<BatchStatusDialog {...defaultProps} />);

    const form = screen.getByRole('button', { name: /apply to/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('planning', undefined);
    });
  });

  it('calls onClose after successful submit', async () => {
    render(<BatchStatusDialog {...defaultProps} />);

    const form = screen.getByRole('button', { name: /apply to/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows submit button text with count and entity label', () => {
    render(<BatchStatusDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: /apply to 5 events/i })).toBeInTheDocument();
  });

  it('shows singular form in submit button for count of 1', () => {
    render(<BatchStatusDialog {...defaultProps} count={1} />);
    expect(screen.getByRole('button', { name: /apply to 1 event$/i })).toBeInTheDocument();
  });

  it('shows Updating... text while submitting', async () => {
    let resolveSubmit: () => void;
    mockOnSubmit.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );
    render(<BatchStatusDialog {...defaultProps} />);

    const form = screen.getByRole('button', { name: /apply to/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });

    resolveSubmit!();
    await waitFor(() => {
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    let resolveSubmit: () => void;
    mockOnSubmit.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );
    render(<BatchStatusDialog {...defaultProps} />);

    const form = screen.getByRole('button', { name: /apply to/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /updating/i });
      expect(submitButton).toBeDisabled();
    });

    resolveSubmit!();
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays error message when onSubmit rejects', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Server error'));
    render(<BatchStatusDialog {...defaultProps} />);

    const form = screen.getByRole('button', { name: /apply to/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('displays generic error for non-Error rejection', async () => {
    mockOnSubmit.mockRejectedValue('unknown');
    render(<BatchStatusDialog {...defaultProps} />);

    const form = screen.getByRole('button', { name: /apply to/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Failed to update status')).toBeInTheDocument();
    });
  });

  it('does not call onClose when submit fails', async () => {
    mockOnSubmit.mockRejectedValue(new Error('fail'));
    render(<BatchStatusDialog {...defaultProps} />);

    const form = screen.getByRole('button', { name: /apply to/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('fail')).toBeInTheDocument();
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
