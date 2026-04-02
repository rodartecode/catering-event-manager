import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { render, screen } from '../../../test/helpers/render';
import { BulkActionBar } from './BulkActionBar';

describe('BulkActionBar', () => {
  const defaultProps = {
    count: 3,
    entityLabel: 'event',
    onUpdateStatus: vi.fn(),
    onClear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when count is 0', () => {
    const { container } = render(<BulkActionBar {...defaultProps} count={0} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders with plural label for multiple items', () => {
    render(<BulkActionBar {...defaultProps} count={3} />);

    expect(screen.getByText('3 events selected')).toBeInTheDocument();
  });

  it('renders with singular label for 1 item', () => {
    render(<BulkActionBar {...defaultProps} count={1} />);

    expect(screen.getByText('1 event selected')).toBeInTheDocument();
  });

  it('uses the provided entity label', () => {
    render(<BulkActionBar {...defaultProps} entityLabel="task" count={5} />);

    expect(screen.getByText('5 tasks selected')).toBeInTheDocument();
  });

  it('calls onClear when Clear Selection is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(<BulkActionBar {...defaultProps} onClear={onClear} />);

    await user.click(screen.getByRole('button', { name: 'Clear Selection' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('calls onUpdateStatus when Update Status is clicked', async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn();

    render(<BulkActionBar {...defaultProps} onUpdateStatus={onUpdateStatus} />);

    await user.click(screen.getByRole('button', { name: 'Update Status' }));
    expect(onUpdateStatus).toHaveBeenCalledOnce();
  });

  it('renders both action buttons', () => {
    render(<BulkActionBar {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Clear Selection' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Status' })).toBeInTheDocument();
  });
});
