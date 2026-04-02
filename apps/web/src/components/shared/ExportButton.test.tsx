import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { render, screen } from '../../../test/helpers/render';
import { ExportButton } from './ExportButton';

// Mock dependencies
vi.mock('@/lib/export-utils', () => ({
  downloadCSVString: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import toast from 'react-hot-toast';
import { downloadCSVString } from '@/lib/export-utils';

describe('ExportButton', () => {
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default label', () => {
    render(<ExportButton onExport={mockOnExport} />);

    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<ExportButton onExport={mockOnExport} label="Download Report" />);

    expect(screen.getByRole('button', { name: 'Download Report' })).toBeInTheDocument();
  });

  it('calls onExport and downloads CSV on success', async () => {
    const user = userEvent.setup();
    mockOnExport.mockResolvedValue({
      csv: 'col1,col2\nval1,val2',
      filename: 'export.csv',
      rowCount: 1,
    });

    render(<ExportButton onExport={mockOnExport} />);

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(mockOnExport).toHaveBeenCalledOnce();
    expect(downloadCSVString).toHaveBeenCalledWith('col1,col2\nval1,val2', 'export.csv');
    expect(toast.success).toHaveBeenCalledWith('Exported 1 rows');
  });

  it('shows error toast on export failure', async () => {
    const user = userEvent.setup();
    mockOnExport.mockRejectedValue(new Error('Network error'));

    render(<ExportButton onExport={mockOnExport} />);

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(toast.error).toHaveBeenCalledWith('Export failed');
  });

  it('shows "Exporting..." text and disables button while exporting', async () => {
    const user = userEvent.setup();
    let resolveExport: (value: unknown) => void;
    mockOnExport.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      })
    );

    render(<ExportButton onExport={mockOnExport} />);

    // Start export
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    // Should show exporting state
    const button = screen.getByRole('button', { name: 'Exporting...' });
    expect(button).toBeDisabled();

    // Resolve the export
    resolveExport!({ csv: '', filename: 'test.csv', rowCount: 0 });
  });
});
