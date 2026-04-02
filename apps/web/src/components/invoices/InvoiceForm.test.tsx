import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceForm } from './InvoiceForm';

const { mockMutate, mockRouterPush, mockRouterBack, mockIsPending, mockError } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockRouterPush: vi.fn(),
  mockRouterBack: vi.fn(),
  mockIsPending: { value: false },
  mockError: { value: null as { message: string } | null },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: mockRouterPush,
    back: mockRouterBack,
  }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: vi.fn().mockReturnValue({
      invoice: {
        listByEvent: { invalidate: vi.fn() },
      },
    }),
    invoice: {
      create: {
        useMutation: vi.fn().mockImplementation(() => ({
          mutate: mockMutate,
          isPending: mockIsPending.value,
          error: mockError.value,
        })),
      },
    },
  },
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

describe('InvoiceForm', () => {
  const defaultProps = {
    eventId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending.value = false;
    mockError.value = null;
  });

  describe('rendering', () => {
    it('renders the Line Items heading', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.getByText('Line Items')).toBeInTheDocument();
    });

    it('renders column headers for the first line item', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Qty')).toBeInTheDocument();
      expect(screen.getByText('Unit Price')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('renders one line item by default', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      const descInputs = screen.getAllByPlaceholderText('Service description');
      expect(descInputs).toHaveLength(1);
    });

    it('renders default quantity of 1.00', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      const qtyInputs = screen.getAllByDisplayValue('1.00');
      expect(qtyInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('renders totals section', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('Tax Rate (%)')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('renders Due Date field', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
    });

    it('renders Notes field', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    });

    it('renders Create Invoice submit button', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Create Invoice' })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders Add line item button', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.getByText('+ Add line item')).toBeInTheDocument();
    });

    it('shows zero totals initially', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      // Subtotal, tax amount, and total should all show $0.00
      const zeroDollars = screen.getAllByText('$0.00');
      expect(zeroDollars.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('user interactions', () => {
    it('calls router.back when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(mockRouterBack).toHaveBeenCalledTimes(1);
    });

    it('adds a new line item when clicking Add line item', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      await user.click(screen.getByText('+ Add line item'));

      const descInputs = screen.getAllByPlaceholderText('Service description');
      expect(descInputs).toHaveLength(2);
    });

    it('does not show remove button when only one line item exists', () => {
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.queryByLabelText(/remove line item/i)).not.toBeInTheDocument();
    });

    it('shows remove buttons when multiple line items exist', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      await user.click(screen.getByText('+ Add line item'));

      const removeButtons = screen.getAllByLabelText(/remove line item/i);
      expect(removeButtons).toHaveLength(2);
    });

    it('removes a line item when clicking remove', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      // Add a second line item
      await user.click(screen.getByText('+ Add line item'));
      expect(screen.getAllByPlaceholderText('Service description')).toHaveLength(2);

      // Remove the first line item
      const removeButtons = screen.getAllByLabelText(/remove line item/i);
      await user.click(removeButtons[0]);

      expect(screen.getAllByPlaceholderText('Service description')).toHaveLength(1);
    });

    it('allows typing a line item description', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      const descInput = screen.getByPlaceholderText('Service description');
      await user.type(descInput, 'Catering service');

      expect(descInput).toHaveValue('Catering service');
    });

    it('allows entering a unit price', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      const priceInput = screen.getByPlaceholderText('0.00');
      await user.type(priceInput, '50.00');

      expect(priceInput).toHaveValue('50.00');
    });

    it('calculates amount for a line item', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      const priceInput = screen.getByPlaceholderText('0.00');
      await user.type(priceInput, '25.00');

      // 1.00 qty * 25.00 price = $25.00 (appears in line item and subtotal)
      const amounts = screen.getAllByText('$25.00');
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });

    it('allows entering a tax rate', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      const taxInput = screen.getByPlaceholderText('0');
      await user.type(taxInput, '8.5');

      expect(taxInput).toHaveValue('8.5');
    });
  });

  describe('validation', () => {
    it('does not call mutate when submitting with empty description', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      // Leave description empty, set a price
      const priceInput = screen.getByPlaceholderText('0.00');
      await user.type(priceInput, '50.00');
      await user.click(screen.getByRole('button', { name: 'Create Invoice' }));

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('does not call mutate when submitting with empty unit price', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      const descInput = screen.getByPlaceholderText('Service description');
      await user.type(descInput, 'Catering');
      await user.click(screen.getByRole('button', { name: 'Create Invoice' }));

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('calls mutate with valid line item data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InvoiceForm {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Service description'), 'Catering');
      await user.type(screen.getByPlaceholderText('0.00'), '100.00');
      await user.click(screen.getByRole('button', { name: 'Create Invoice' }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 1,
          lineItems: [
            expect.objectContaining({
              description: 'Catering',
              quantity: '1.00',
              unitPrice: '100.00',
            }),
          ],
        })
      );
    });
  });

  describe('pending state', () => {
    it('shows Creating... text and disables button when mutation is pending', () => {
      mockIsPending.value = true;

      renderWithProviders(<InvoiceForm {...defaultProps} />);

      const submitBtn = screen.getByRole('button', { name: 'Creating...' });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('displays mutation error message', () => {
      mockError.value = { message: 'Failed to create invoice' };

      renderWithProviders(<InvoiceForm {...defaultProps} />);

      expect(screen.getByText('Failed to create invoice')).toBeInTheDocument();
    });
  });
});
