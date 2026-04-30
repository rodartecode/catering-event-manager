import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductionStepsEditor } from './ProductionStepsEditor';

const { mockMutate, mockIsPending } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockIsPending: { value: false },
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    menu: {
      updateProductionSteps: {
        useMutation: vi.fn().mockImplementation(() => ({
          mutate: mockMutate,
          isPending: mockIsPending.value,
        })),
      },
    },
    useUtils: vi.fn().mockReturnValue({
      menu: { getItemById: { invalidate: vi.fn() } },
    }),
  },
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({
  default: mockToast,
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

const existingSteps = [
  {
    name: 'Marinate fish',
    prepType: 'marinate',
    stationType: 'prep_counter',
    durationMinutes: 120,
    offsetMinutes: -480,
  },
  {
    name: 'Grill fish',
    prepType: 'grill',
    stationType: 'grill',
    durationMinutes: 15,
    offsetMinutes: -60,
  },
];

describe('ProductionStepsEditor', () => {
  const defaultProps = {
    menuItemId: 42,
    menuItemName: 'Grilled Salmon',
    initialSteps: null as typeof existingSteps | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending.value = false;
  });

  describe('rendering', () => {
    it('renders heading with menu item name', () => {
      renderWithProviders(<ProductionStepsEditor {...defaultProps} />);
      expect(screen.getByText('Production Steps for Grilled Salmon')).toBeInTheDocument();
    });

    it('renders Add Step and Save buttons', () => {
      renderWithProviders(<ProductionStepsEditor {...defaultProps} />);
      expect(screen.getByText('Add Step')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('renders empty state when no steps', () => {
      renderWithProviders(<ProductionStepsEditor {...defaultProps} />);
      expect(screen.getByText(/no production steps defined/i)).toBeInTheDocument();
    });

    it('renders existing steps when provided', () => {
      renderWithProviders(<ProductionStepsEditor {...defaultProps} initialSteps={existingSteps} />);
      expect(screen.getByText('Marinate fish')).toBeInTheDocument();
      expect(screen.getByText('Grill fish')).toBeInTheDocument();
    });

    it('renders step numbering', () => {
      renderWithProviders(<ProductionStepsEditor {...defaultProps} initialSteps={existingSteps} />);
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
    });

    it('renders duration and offset for each step', () => {
      renderWithProviders(<ProductionStepsEditor {...defaultProps} initialSteps={existingSteps} />);
      expect(screen.getByText('120min')).toBeInTheDocument();
      expect(screen.getByText('8h before')).toBeInTheDocument();
      expect(screen.getByText('15min')).toBeInTheDocument();
      expect(screen.getByText('1h before')).toBeInTheDocument();
    });

    it('renders Remove button for each step', () => {
      renderWithProviders(<ProductionStepsEditor {...defaultProps} initialSteps={existingSteps} />);
      expect(screen.getByLabelText('Remove step Marinate fish')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove step Grill fish')).toBeInTheDocument();
    });
  });

  describe('adding steps', () => {
    it('shows add form when Add Step clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionStepsEditor {...defaultProps} />);
      await user.click(screen.getByText('Add Step'));
      expect(screen.getByLabelText('Step Name')).toBeInTheDocument();
    });

    it('hides add form when inline Cancel clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionStepsEditor {...defaultProps} />);
      await user.click(screen.getByText('Add Step'));
      expect(screen.getByLabelText('Step Name')).toBeInTheDocument();
      await user.click(screen.getByText('Cancel'));
      expect(screen.queryByLabelText('Step Name')).not.toBeInTheDocument();
    });

    it('adds step to list when Add clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionStepsEditor {...defaultProps} />);
      await user.click(screen.getByText('Add Step'));
      await user.type(screen.getByLabelText('Step Name'), 'Chop vegetables');
      await user.click(screen.getByText('Add'));
      expect(screen.getByText('Chop vegetables')).toBeInTheDocument();
    });

    it('shows toast error when adding step with empty name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionStepsEditor {...defaultProps} />);
      await user.click(screen.getByText('Add Step'));
      await user.click(screen.getByText('Add'));
      expect(mockToast.error).toHaveBeenCalledWith('Step name is required');
    });
  });

  describe('removing steps', () => {
    it('removes step when Remove clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionStepsEditor {...defaultProps} initialSteps={existingSteps} />);
      await user.click(screen.getByLabelText('Remove step Marinate fish'));
      expect(screen.queryByText('Marinate fish')).not.toBeInTheDocument();
      expect(screen.getByText('Grill fish')).toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('calls mutate with steps on Save', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionStepsEditor {...defaultProps} initialSteps={existingSteps} />);
      await user.click(screen.getByText('Save'));
      expect(mockMutate).toHaveBeenCalledWith({
        menuItemId: 42,
        productionSteps: existingSteps,
      });
    });

    it('calls mutate with null when no steps', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductionStepsEditor {...defaultProps} />);
      await user.click(screen.getByText('Save'));
      expect(mockMutate).toHaveBeenCalledWith({
        menuItemId: 42,
        productionSteps: null,
      });
    });
  });

  describe('pending state', () => {
    it('shows Saving... and disables Save button when pending', () => {
      mockIsPending.value = true;
      renderWithProviders(<ProductionStepsEditor {...defaultProps} />);
      const button = screen.getByText('Saving...');
      expect(button).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderWithProviders(
        <ProductionStepsEditor {...defaultProps} initialSteps={existingSteps} />
      );
      const results = await (await import('../../../test/helpers/axe')).axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
