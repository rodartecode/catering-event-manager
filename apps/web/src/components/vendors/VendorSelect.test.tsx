import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VendorSelect } from './VendorSelect';

const mockUseQuery = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    vendor: {
      list: {
        useQuery: () => mockUseQuery(),
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

describe('VendorSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading text while fetching', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    wrap(<VendorSelect value={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/loading vendors/i)).toBeInTheDocument();
  });

  it('renders vendor options after fetch', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 1, companyName: 'Acme Rentals', serviceType: 'rentals' },
        { id: 2, companyName: 'Bloom Florals', serviceType: 'florals' },
      ],
      isLoading: false,
    });
    wrap(<VendorSelect value={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/Acme Rentals — Rentals/)).toBeInTheDocument();
    expect(screen.getByText(/Bloom Florals — Florals/)).toBeInTheDocument();
  });

  it('calls onSelect with vendor data when an option is chosen', async () => {
    mockUseQuery.mockReturnValue({
      data: [{ id: 7, companyName: 'Premium AV', serviceType: 'av' }],
      isLoading: false,
    });
    const onSelect = vi.fn();
    wrap(<VendorSelect value={null} onSelect={onSelect} />);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Vendor'), '7');

    expect(onSelect).toHaveBeenCalledWith({
      id: 7,
      companyName: 'Premium AV',
      serviceType: 'av',
    });
  });

  it('calls onSelect with null when placeholder is chosen', async () => {
    mockUseQuery.mockReturnValue({
      data: [{ id: 1, companyName: 'X', serviceType: 'other' }],
      isLoading: false,
    });
    const onSelect = vi.fn();
    wrap(<VendorSelect value={1} onSelect={onSelect} />);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Vendor'), '');

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
