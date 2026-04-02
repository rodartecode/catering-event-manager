import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { type Mock, vi } from 'vitest';
import { FollowUpBanner } from './FollowUpBanner';

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    clients: {
      getDueFollowUps: {
        useQuery: mockUseQuery,
      },
    },
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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

describe('FollowUpBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when data is null', () => {
    mockUseQuery.mockReturnValue({ data: null });

    const { container } = renderWithProviders(<FollowUpBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when count is 0', () => {
    mockUseQuery.mockReturnValue({ data: { count: 0, followUps: [] } });

    const { container } = renderWithProviders(<FollowUpBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders banner with follow-up count', () => {
    mockUseQuery.mockReturnValue({
      data: {
        count: 3,
        followUps: [{ daysOverdue: 0 }, { daysOverdue: 0 }, { daysOverdue: 0 }],
      },
    });

    renderWithProviders(<FollowUpBanner />);
    expect(screen.getByText(/You have 3 follow-ups due/)).toBeInTheDocument();
  });

  it('renders singular form for 1 follow-up', () => {
    mockUseQuery.mockReturnValue({
      data: {
        count: 1,
        followUps: [{ daysOverdue: 0 }],
      },
    });

    renderWithProviders(<FollowUpBanner />);
    expect(screen.getByText(/You have 1 follow-up due/)).toBeInTheDocument();
  });

  it('shows overdue count when there are overdue follow-ups', () => {
    mockUseQuery.mockReturnValue({
      data: {
        count: 3,
        followUps: [{ daysOverdue: 2 }, { daysOverdue: 1 }, { daysOverdue: 0 }],
      },
    });

    renderWithProviders(<FollowUpBanner />);
    expect(screen.getByText('(2 overdue)')).toBeInTheDocument();
    expect(screen.getByText(/1 due today/)).toBeInTheDocument();
  });

  it('shows only overdue when all are overdue', () => {
    mockUseQuery.mockReturnValue({
      data: {
        count: 2,
        followUps: [{ daysOverdue: 3 }, { daysOverdue: 1 }],
      },
    });

    renderWithProviders(<FollowUpBanner />);
    expect(screen.getByText('2 overdue')).toBeInTheDocument();
  });

  it('renders View All link pointing to clients with followups filter', () => {
    mockUseQuery.mockReturnValue({
      data: {
        count: 1,
        followUps: [{ daysOverdue: 0 }],
      },
    });

    renderWithProviders(<FollowUpBanner />);
    const link = screen.getByText('View All');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/clients?followups=due');
  });

  it('dismisses when close button is clicked', async () => {
    const user = userEvent.setup();
    mockUseQuery.mockReturnValue({
      data: {
        count: 1,
        followUps: [{ daysOverdue: 0 }],
      },
    });

    const { container } = renderWithProviders(<FollowUpBanner />);
    expect(screen.getByText(/You have 1 follow-up due/)).toBeInTheDocument();

    // Click the dismiss button (the button without text, with the X icon)
    const buttons = container.querySelectorAll('button');
    await user.click(buttons[0]);

    expect(screen.queryByText(/You have 1 follow-up due/)).not.toBeInTheDocument();
  });
});
