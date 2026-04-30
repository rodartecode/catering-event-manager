import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventVendorList } from './EventVendorList';

const mockListByEvent = vi.fn();
const mockUnassign = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    useUtils: () => ({
      vendor: { listByEvent: { invalidate: vi.fn() } },
    }),
    vendor: {
      listByEvent: {
        useQuery: () => mockListByEvent(),
      },
      unassignFromEvent: {
        useMutation: () => ({ mutate: mockUnassign, isPending: false, error: null }),
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

describe('EventVendorList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no vendors are assigned', () => {
    mockListByEvent.mockReturnValue({ data: [], isLoading: false });
    wrap(<EventVendorList eventId={1} />);
    expect(screen.getByText(/No vendors assigned/i)).toBeInTheDocument();
  });

  it('renders assigned vendors', () => {
    mockListByEvent.mockReturnValue({
      data: [
        {
          id: 1,
          eventId: 1,
          vendorId: 11,
          role: 'Lead photographer',
          cost: '1200.00',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          companyName: 'Photog Co',
          contactName: 'Alice',
          email: null,
          phone: null,
          serviceType: 'photography',
        },
      ],
      isLoading: false,
    });
    wrap(<EventVendorList eventId={1} />);
    expect(screen.getByText('Photog Co')).toBeInTheDocument();
    expect(screen.getByText('Lead photographer')).toBeInTheDocument();
    expect(screen.getByText(/Cost:/)).toBeInTheDocument();
    expect(screen.getByText(/\$1,200\.00/)).toBeInTheDocument();
  });

  it('hides Remove button when canManage is false', () => {
    mockListByEvent.mockReturnValue({
      data: [
        {
          id: 1,
          eventId: 1,
          vendorId: 11,
          role: null,
          cost: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          companyName: 'Photog Co',
          contactName: null,
          email: null,
          phone: null,
          serviceType: 'photography',
        },
      ],
      isLoading: false,
    });
    wrap(<EventVendorList eventId={1} canManage={false} />);
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
  });

  it('calls unassignFromEvent when Remove is confirmed', async () => {
    mockListByEvent.mockReturnValue({
      data: [
        {
          id: 1,
          eventId: 7,
          vendorId: 99,
          role: null,
          cost: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          companyName: 'Photog Co',
          contactName: null,
          email: null,
          phone: null,
          serviceType: 'photography',
        },
      ],
      isLoading: false,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    wrap(<EventVendorList eventId={7} canManage={true} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Remove/ }));

    expect(mockUnassign).toHaveBeenCalledWith({ eventId: 7, vendorId: 99 });
  });
});
