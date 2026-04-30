import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VendorForm } from './VendorForm';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      vendor: {
        list: { invalidate: vi.fn() },
        getById: { invalidate: vi.fn() },
      },
    }),
    vendor: {
      create: {
        useMutation: () => ({ mutate: mockCreate, isPending: false, error: null }),
      },
      update: {
        useMutation: () => ({ mutate: mockUpdate, isPending: false, error: null }),
      },
    },
  },
}));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

describe('VendorForm', () => {
  const defaultProps = { onSuccess: vi.fn(), onCancel: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create-mode submit button', () => {
    wrap(<VendorForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Create Vendor/ })).toBeInTheDocument();
  });

  it('shows validation error when company name is empty', async () => {
    wrap(<VendorForm {...defaultProps} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Create Vendor/ }));
    expect(screen.getByText(/Company name is required/i)).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('submits create payload when valid', async () => {
    wrap(<VendorForm {...defaultProps} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Company Name/), 'Floral Co');
    await user.selectOptions(screen.getByLabelText(/Service Type/), 'florals');
    await user.click(screen.getByRole('button', { name: /Create Vendor/ }));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: 'Floral Co', serviceType: 'florals' })
    );
  });

  it('renders edit-mode and pre-populates fields', () => {
    wrap(
      <VendorForm
        {...defaultProps}
        initialData={{
          id: 9,
          companyName: 'Existing Co',
          contactName: 'Bob',
          email: 'bob@x.com',
          phone: '555',
          serviceType: 'rentals',
          notes: 'old notes',
          isActive: true,
        }}
      />
    );

    expect(screen.getByRole('button', { name: /Save Changes/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Company Name/)).toHaveValue('Existing Co');
    expect(screen.getByLabelText(/Service Type/)).toHaveValue('rentals');
    expect(screen.getByLabelText(/Contact Name/)).toHaveValue('Bob');
  });

  it('calls onCancel when Cancel button clicked', async () => {
    const onCancel = vi.fn();
    wrap(<VendorForm {...defaultProps} onCancel={onCancel} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onCancel).toHaveBeenCalled();
  });
});
