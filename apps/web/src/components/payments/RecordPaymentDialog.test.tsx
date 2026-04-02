import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../test/helpers/render';
import { RecordPaymentDialog } from './RecordPaymentDialog';

const { mockMutate, mockIsPending, mockError } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockIsPending: { value: false },
  mockError: { value: null as { message: string } | null },
}));

vi.mock('@/hooks/use-focus-trap', () => ({
  useFocusTrap: vi.fn(),
  useDialogId: vi.fn().mockReturnValue('record-payment-1'),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    payment: {
      record: {
        useMutation: (options: { onSuccess?: () => void }) => ({
          mutate: mockMutate.mockImplementation(() => {
            options.onSuccess?.();
          }),
          isPending: mockIsPending.value,
          error: mockError.value,
        }),
      },
    },
    useUtils: () => ({
      payment: {
        listByInvoice: { invalidate: vi.fn() },
      },
      invoice: {
        getById: { invalidate: vi.fn() },
      },
    }),
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

describe('RecordPaymentDialog', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const defaultProps = {
    invoiceId: 42,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending.value = false;
    mockError.value = null;
  });

  it('renders dialog with title', () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Record Payment' })).toBeInTheDocument();
  });

  it('has dialog role and aria-modal', () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-labelledby pointing to the title', () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const title = document.getElementById(labelId!);
    expect(title).toHaveTextContent('Record Payment');
  });

  it('renders all form fields', () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reference/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('renders all payment method options', () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('defaults payment method to bank_transfer', () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    const select = screen.getByLabelText(/payment method/i) as HTMLSelectElement;
    expect(select.value).toBe('bank_transfer');
  });

  it('defaults payment date to today', () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    const dateInput = screen.getByLabelText(/payment date/i) as HTMLInputElement;
    const today = new Date().toISOString().split('T')[0];
    expect(dateInput.value).toBe(today);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close icon button is clicked', async () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows validation error for empty amount on submit', async () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    const form = screen.getByRole('button', { name: /record payment/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid amount')).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid amount format', async () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    await user.type(screen.getByLabelText(/amount/i), 'abc');

    const form = screen.getByRole('button', { name: /record payment/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid amount')).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    render(<RecordPaymentDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/amount/i), '150.00');
    await user.selectOptions(screen.getByLabelText(/payment method/i), 'credit_card');
    await user.type(screen.getByLabelText(/reference/i), 'TXN-123');
    await user.type(screen.getByLabelText(/notes/i), 'Deposit payment');

    const form = screen.getByRole('button', { name: /record payment/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: 42,
          amount: '150.00',
          method: 'credit_card',
          reference: 'TXN-123',
          notes: 'Deposit payment',
        })
      );
    });
  });

  it('submits without optional reference and notes as undefined', async () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    await user.type(screen.getByLabelText(/amount/i), '75.50');

    const form = screen.getByRole('button', { name: /record payment/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: 42,
          amount: '75.50',
          reference: undefined,
          notes: undefined,
        })
      );
    });
  });

  it('calls onClose on successful mutation', async () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    await user.type(screen.getByLabelText(/amount/i), '100');

    const form = screen.getByRole('button', { name: /record payment/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('allows changing payment method', async () => {
    render(<RecordPaymentDialog {...defaultProps} />);
    await user.selectOptions(screen.getByLabelText(/payment method/i), 'cash');
    const select = screen.getByLabelText(/payment method/i) as HTMLSelectElement;
    expect(select.value).toBe('cash');
  });

  it('disables submit button when mutation is pending', () => {
    mockIsPending.value = true;
    render(<RecordPaymentDialog {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: /recording/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading text when mutation is pending', () => {
    mockIsPending.value = true;
    render(<RecordPaymentDialog {...defaultProps} />);
    expect(screen.getByText('Recording...')).toBeInTheDocument();
  });

  it('displays mutation error message', () => {
    mockError.value = { message: 'Insufficient funds' };
    render(<RecordPaymentDialog {...defaultProps} />);
    expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
  });
});
