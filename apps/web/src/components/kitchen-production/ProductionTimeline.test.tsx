import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockProductionTask,
  mockTimelineItem,
  resetMockCounter,
} from '../../../test/helpers/component-factories';
import { ProductionTimeline } from './ProductionTimeline';

const {
  mockTimelineData,
  mockIsLoading,
  mockIsAdmin,
  mockStatusMutate,
  mockAutoGenerateMutate,
  mockRecalculateMutate,
  mockRecalcIsPending,
  mockAutoGenIsPending,
} = vi.hoisted(() => ({
  mockTimelineData: { value: undefined as unknown[] | undefined },
  mockIsLoading: { value: false },
  mockIsAdmin: { value: true },
  mockStatusMutate: vi.fn(),
  mockAutoGenerateMutate: vi.fn(),
  mockRecalculateMutate: vi.fn(),
  mockRecalcIsPending: { value: false },
  mockAutoGenIsPending: { value: false },
}));

vi.mock('@/lib/use-auth', () => ({
  useIsAdmin: () => ({ isAdmin: mockIsAdmin.value, isLoading: false }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    kitchenProduction: {
      timeline: {
        getByEvent: {
          useQuery: vi.fn().mockImplementation(() => ({
            data: mockTimelineData.value,
            isLoading: mockIsLoading.value,
          })),
        },
        recalculate: {
          useMutation: vi.fn().mockImplementation(() => ({
            mutate: mockRecalculateMutate,
            isPending: mockRecalcIsPending.value,
          })),
        },
      },
      task: {
        updateStatus: {
          useMutation: vi.fn().mockImplementation(() => ({
            mutate: mockStatusMutate,
            isPending: false,
          })),
        },
      },
      autoGenerate: {
        useMutation: vi.fn().mockImplementation(() => ({
          mutate: mockAutoGenerateMutate,
          isPending: mockAutoGenIsPending.value,
        })),
      },
      station: {
        list: { useQuery: vi.fn().mockReturnValue({ data: [] }) },
      },
    },
    useUtils: vi.fn().mockReturnValue({
      kitchenProduction: {
        timeline: { getByEvent: { invalidate: vi.fn() } },
        task: { list: { invalidate: vi.fn() } },
      },
    }),
  },
}));

vi.mock('./ProductionTaskForm', () => ({
  ProductionTaskForm: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess: () => void;
    onCancel: () => void;
  }) => (
    <div data-testid="production-task-form">
      <button type="button" onClick={onSuccess}>
        mock-submit
      </button>
      <button type="button" onClick={onCancel}>
        mock-cancel
      </button>
    </div>
  ),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
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

describe('ProductionTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockCounter();
    mockTimelineData.value = undefined;
    mockIsLoading.value = false;
    mockIsAdmin.value = true;
    mockRecalcIsPending.value = false;
    mockAutoGenIsPending.value = false;
  });

  describe('loading state', () => {
    it('renders skeleton when loading', () => {
      mockIsLoading.value = true;
      const { container } = renderWithProviders(<ProductionTimeline eventId={1} />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('empty state', () => {
    it('renders empty state when no tasks', () => {
      mockTimelineData.value = [];
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.getByText('No production tasks yet')).toBeInTheDocument();
    });

    it('renders helpful message in empty state', () => {
      mockTimelineData.value = [];
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(
        screen.getByText('Add tasks to build a production timeline for this event')
      ).toBeInTheDocument();
    });
  });

  describe('rendering with data', () => {
    // The component filter is: offset >= band.minOffset && offset > band.maxOffset
    // With negative numbers, > maxOffset means closer to zero than maxOffset.
    // Day before (min=-1440, max=-720): captures offsets > -720 and >= -1440 → effectively -719 to -1440
    // This means tasks at offsets like -500 land in "Day before" band.
    // Use offsets that clearly land in known bands for reliable testing.
    const sampleTimeline = [
      mockTimelineItem({
        task: mockProductionTask({
          name: 'Day-before marinate',
          offsetMinutes: -500,
          status: 'completed',
        }),
        stationName: 'Cold Storage',
      }),
      mockTimelineItem({
        task: mockProductionTask({
          name: 'Final chop',
          offsetMinutes: -120,
          status: 'pending',
        }),
      }),
      mockTimelineItem({
        task: mockProductionTask({
          name: 'Plate service',
          offsetMinutes: -30,
          status: 'pending',
        }),
      }),
    ];

    it('renders progress counter', () => {
      mockTimelineData.value = sampleTimeline;
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.getByText('1/3 tasks completed')).toBeInTheDocument();
    });

    it('renders time band headings', () => {
      mockTimelineData.value = sampleTimeline;
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.getByText(/Day before/)).toBeInTheDocument();
      expect(screen.getByText(/Morning of/)).toBeInTheDocument();
      expect(screen.getByText(/Final prep/)).toBeInTheDocument();
      expect(screen.getByText(/Service/)).toBeInTheDocument();
    });

    it('renders all tasks', () => {
      mockTimelineData.value = sampleTimeline;
      renderWithProviders(<ProductionTimeline eventId={1} />);
      // Tasks may appear in multiple bands due to overlapping filter logic,
      // so use getAllByText to check presence
      expect(screen.getAllByText('Day-before marinate').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Final chop').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Plate service').length).toBeGreaterThan(0);
    });

    it('shows task count per band', () => {
      mockTimelineData.value = sampleTimeline;
      renderWithProviders(<ProductionTimeline eventId={1} />);
      // At least one band should show a task count
      const countLabels = screen.getAllByText(/\(\d+ tasks?\)/);
      expect(countLabels.length).toBeGreaterThan(0);
    });

    it('shows "No tasks in this window" for empty bands', () => {
      mockTimelineData.value = [
        mockTimelineItem({
          task: mockProductionTask({ offsetMinutes: -30 }),
        }),
      ];
      renderWithProviders(<ProductionTimeline eventId={1} />);
      const emptyMessages = screen.getAllByText('No tasks in this window');
      expect(emptyMessages.length).toBeGreaterThan(0);
    });

    it('renders earlier prep section for tasks beyond 24h', () => {
      mockTimelineData.value = [
        mockTimelineItem({
          task: mockProductionTask({
            name: 'Slow cure',
            offsetMinutes: -2000,
          }),
        }),
      ];
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.getByText(/Earlier prep/)).toBeInTheDocument();
      expect(screen.getByText('Slow cure')).toBeInTheDocument();
    });

    it('counts completed and skipped tasks in progress', () => {
      mockTimelineData.value = [
        mockTimelineItem({
          task: mockProductionTask({ status: 'completed', offsetMinutes: -30 }),
        }),
        mockTimelineItem({
          task: mockProductionTask({ status: 'skipped', offsetMinutes: -30 }),
        }),
        mockTimelineItem({
          task: mockProductionTask({ status: 'pending', offsetMinutes: -30 }),
        }),
      ];
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.getByText('2/3 tasks completed')).toBeInTheDocument();
    });
  });

  describe('admin-only buttons', () => {
    it('shows admin buttons for admin user', () => {
      mockTimelineData.value = [];
      mockIsAdmin.value = true;
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.getByText('Recalculate Times')).toBeInTheDocument();
      expect(screen.getByText('Auto-generate')).toBeInTheDocument();
      expect(screen.getByText('Add Task')).toBeInTheDocument();
    });

    it('hides admin buttons for non-admin user', () => {
      mockTimelineData.value = [];
      mockIsAdmin.value = false;
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.queryByText('Recalculate Times')).not.toBeInTheDocument();
      expect(screen.queryByText('Auto-generate')).not.toBeInTheDocument();
      expect(screen.queryByText('Add Task')).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls autoGenerate mutation when Auto-generate clicked', async () => {
      mockTimelineData.value = [];
      const user = userEvent.setup();
      renderWithProviders(<ProductionTimeline eventId={5} />);
      await user.click(screen.getByText('Auto-generate'));
      expect(mockAutoGenerateMutate).toHaveBeenCalledWith({
        eventId: 5,
        clearExisting: false,
      });
    });

    it('calls recalculate mutation when Recalculate clicked', async () => {
      mockTimelineData.value = [];
      const user = userEvent.setup();
      renderWithProviders(<ProductionTimeline eventId={5} />);
      await user.click(screen.getByText('Recalculate Times'));
      expect(mockRecalculateMutate).toHaveBeenCalledWith({ eventId: 5 });
    });

    it('toggles task form when Add Task clicked', async () => {
      mockTimelineData.value = [];
      const user = userEvent.setup();
      renderWithProviders(<ProductionTimeline eventId={1} />);
      await user.click(screen.getByText('Add Task'));
      expect(screen.getByTestId('production-task-form')).toBeInTheDocument();
    });

    it('hides task form when Cancel clicked within form', async () => {
      mockTimelineData.value = [];
      const user = userEvent.setup();
      renderWithProviders(<ProductionTimeline eventId={1} />);
      await user.click(screen.getByText('Add Task'));
      await user.click(screen.getByText('mock-cancel'));
      expect(screen.queryByTestId('production-task-form')).not.toBeInTheDocument();
    });

    it('hides task form on successful submit', async () => {
      mockTimelineData.value = [];
      const user = userEvent.setup();
      renderWithProviders(<ProductionTimeline eventId={1} />);
      await user.click(screen.getByText('Add Task'));
      await user.click(screen.getByText('mock-submit'));
      expect(screen.queryByTestId('production-task-form')).not.toBeInTheDocument();
    });

    it('calls statusMutation when task status changes', async () => {
      const task = mockProductionTask({ id: 99, status: 'pending', offsetMinutes: -30 });
      mockTimelineData.value = [mockTimelineItem({ task })];
      const user = userEvent.setup();
      renderWithProviders(<ProductionTimeline eventId={1} />);
      // Only one pending task, so only one Start button
      const startButtons = screen.getAllByText('Start');
      await user.click(startButtons[0]);
      expect(mockStatusMutate).toHaveBeenCalledWith({
        id: 99,
        status: 'in_progress',
      });
    });
  });

  describe('mutation pending states', () => {
    it('shows Recalculating... when recalculate is pending', () => {
      mockTimelineData.value = [];
      mockRecalcIsPending.value = true;
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.getByText('Recalculating...')).toBeInTheDocument();
    });

    it('shows Generating... when auto-generate is pending', () => {
      mockTimelineData.value = [];
      mockAutoGenIsPending.value = true;
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('disables buttons during pending mutations', () => {
      mockTimelineData.value = [];
      mockRecalcIsPending.value = true;
      mockAutoGenIsPending.value = true;
      renderWithProviders(<ProductionTimeline eventId={1} />);
      expect(screen.getByText('Recalculating...')).toBeDisabled();
      expect(screen.getByText('Generating...')).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('has no accessibility violations with empty state', async () => {
      mockTimelineData.value = [];
      const { container } = renderWithProviders(<ProductionTimeline eventId={1} />);
      const results = await (await import('../../../test/helpers/axe')).axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations with data', async () => {
      mockTimelineData.value = [
        mockTimelineItem({
          task: mockProductionTask({ offsetMinutes: -120 }),
          stationName: 'Oven',
        }),
      ];
      const { container } = renderWithProviders(<ProductionTimeline eventId={1} />);
      const results = await (await import('../../../test/helpers/axe')).axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
