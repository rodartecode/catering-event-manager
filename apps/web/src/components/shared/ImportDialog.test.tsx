import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportDialog } from './ImportDialog';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
  },
}));

vi.mock('@/hooks/use-focus-trap', () => ({
  useFocusTrap: vi.fn(),
  useDialogId: vi.fn().mockReturnValue('import-dialog-title-1'),
}));

describe('ImportDialog', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();
  const mockOnSuccess = vi.fn();
  const defaultProps = {
    entityLabel: 'event',
    onImport: mockOnImport,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnImport.mockResolvedValue({ imported: 0, errors: [], total: 0 });
  });

  it('renders dialog with entity-specific title', () => {
    render(<ImportDialog {...defaultProps} />);
    expect(screen.getByText('Import events')).toBeInTheDocument();
  });

  it('has dialog role and aria-modal', () => {
    render(<ImportDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-labelledby pointing to the title', () => {
    render(<ImportDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const title = document.getElementById(labelId!);
    expect(title).toHaveTextContent('Import events');
  });

  it('renders file input for CSV', () => {
    render(<ImportDialog {...defaultProps} />);
    expect(screen.getByLabelText(/csv file/i)).toBeInTheDocument();
  });

  it('shows file size limit help text', () => {
    render(<ImportDialog {...defaultProps} />);
    expect(screen.getByText(/max file size: 1mb/i)).toBeInTheDocument();
  });

  it('calls onClose when close icon button is clicked', async () => {
    render(<ImportDialog {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    render(<ImportDialog {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables Import button when no file is selected', () => {
    render(<ImportDialog {...defaultProps} />);
    const importButton = screen.getByRole('button', { name: /^import$/i });
    expect(importButton).toBeDisabled();
  });

  it('rejects non-CSV files', () => {
    render(<ImportDialog {...defaultProps} />);
    const file = new File(['data'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/csv file/i) as HTMLInputElement;

    // Use fireEvent to simulate file selection since userEvent.upload may not set file.name
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(screen.getByText('Only CSV files are accepted')).toBeInTheDocument();
  });

  it('rejects files exceeding 1MB', async () => {
    render(<ImportDialog {...defaultProps} />);
    const largeContent = 'x'.repeat(1024 * 1024 + 1);
    const file = new File([largeContent], 'big.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/csv file/i);

    await user.upload(input, file);

    expect(screen.getByText('File size exceeds 1MB limit')).toBeInTheDocument();
  });

  it('enables Import button after selecting a valid CSV file', async () => {
    render(<ImportDialog {...defaultProps} />);
    const file = new File(['name,email\nJohn,john@test.com'], 'data.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/csv file/i);

    await user.upload(input, file);

    const importButton = screen.getByRole('button', { name: /^import$/i });
    expect(importButton).not.toBeDisabled();
  });

  it('calls onImport with file content and shows success result', async () => {
    mockOnImport.mockResolvedValue({ imported: 3, errors: [], total: 3 });
    render(<ImportDialog {...defaultProps} />);

    const file = new File(['name,email\nA,a@t.com\nB,b@t.com\nC,c@t.com'], 'data.csv', {
      type: 'text/csv',
    });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith('name,email\nA,a@t.com\nB,b@t.com\nC,c@t.com');
    });

    await waitFor(() => {
      expect(screen.getByText('3 of 3 rows imported successfully')).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback when items are imported', async () => {
    mockOnImport.mockResolvedValue({ imported: 2, errors: [], total: 2 });
    render(<ImportDialog {...defaultProps} />);

    const file = new File(['data'], 'data.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('shows error table when import has errors', async () => {
    mockOnImport.mockResolvedValue({
      imported: 1,
      total: 3,
      errors: [
        { row: 2, field: 'email', message: 'Invalid email' },
        { row: 3, field: 'name', message: 'Required' },
      ],
    });
    render(<ImportDialog {...defaultProps} />);

    const file = new File(['data'], 'data.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(screen.getByText('1 of 3 rows imported successfully')).toBeInTheDocument();
      expect(screen.getByText('Errors (2)')).toBeInTheDocument();
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });

  it('shows error message when onImport throws', async () => {
    mockOnImport.mockRejectedValue(new Error('Network error'));
    render(<ImportDialog {...defaultProps} />);

    const file = new File(['data'], 'data.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows generic error when non-Error is thrown', async () => {
    mockOnImport.mockRejectedValue('unknown');
    render(<ImportDialog {...defaultProps} />);

    const file = new File(['data'], 'data.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(screen.getByText('Import failed')).toBeInTheDocument();
    });
  });

  it('shows Importing... text while import is in progress', async () => {
    let resolveImport: (value: { imported: number; errors: []; total: number }) => void;
    mockOnImport.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveImport = resolve;
        })
    );
    render(<ImportDialog {...defaultProps} />);

    const file = new File(['data'], 'data.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    expect(screen.getByText('Importing...')).toBeInTheDocument();

    resolveImport!({ imported: 0, errors: [], total: 0 });
    await waitFor(() => {
      expect(screen.queryByText('Importing...')).not.toBeInTheDocument();
    });
  });

  it('changes Cancel button text to Close after import result', async () => {
    mockOnImport.mockResolvedValue({ imported: 1, errors: [], total: 1 });
    render(<ImportDialog {...defaultProps} />);

    const file = new File(['data'], 'data.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument();
    });
  });

  it('hides Import button after result is shown', async () => {
    mockOnImport.mockResolvedValue({ imported: 1, errors: [], total: 1 });
    render(<ImportDialog {...defaultProps} />);

    const file = new File(['data'], 'data.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^import$/i })).not.toBeInTheDocument();
    });
  });

  it('uses custom entityLabel in title', () => {
    render(<ImportDialog {...defaultProps} entityLabel="task" />);
    expect(screen.getByText('Import tasks')).toBeInTheDocument();
  });
});
