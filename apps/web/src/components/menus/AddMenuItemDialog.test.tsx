import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/helpers/render';
import { AddMenuItemDialog } from './AddMenuItemDialog';

const mockMutateAsync = vi.fn().mockResolvedValue({});
let mockItems: Array<{
  id: number;
  name: string;
  category: string;
  description: string | null;
  costPerPerson: string;
  dietaryTags: string[];
}> = [];
let mockIsLoading = false;

vi.mock('@/lib/trpc', () => ({
  trpc: {
    menu: {
      listItems: {
        useQuery: () => ({
          data: mockItems,
          isLoading: mockIsLoading,
        }),
      },
      addItemToEventMenu: {
        useMutation: () => ({
          mutateAsync: mockMutateAsync,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      menu: {
        listEventMenus: { invalidate: vi.fn() },
        getEventMenuCostEstimate: { invalidate: vi.fn() },
        getEventDietarySummary: { invalidate: vi.fn() },
      },
    }),
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

vi.mock('./DietaryTagBadge', () => ({
  DietaryTagBadge: ({ tag }: { tag: string }) => <span data-testid="dietary-tag">{tag}</span>,
}));

vi.mock('./MenuItemCategoryBadge', () => ({
  MenuItemCategoryBadge: ({ category }: { category: string }) => (
    <span data-testid="category-badge">{category}</span>
  ),
}));

describe('AddMenuItemDialog', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const defaultProps = {
    eventMenuId: 1,
    eventId: 10,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockItems = [
      {
        id: 1,
        name: 'Caesar Salad',
        category: 'appetizer',
        description: 'Classic romaine with croutons',
        costPerPerson: '8.50',
        dietaryTags: ['vegetarian'],
      },
      {
        id: 2,
        name: 'Grilled Salmon',
        category: 'main',
        description: 'Atlantic salmon with herbs',
        costPerPerson: '24.00',
        dietaryTags: ['gluten-free'],
      },
      {
        id: 3,
        name: 'Chocolate Cake',
        category: 'dessert',
        description: null,
        costPerPerson: '12.00',
        dietaryTags: [],
      },
    ];
  });

  it('renders dialog with title', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    expect(screen.getByText('Add Menu Item')).toBeInTheDocument();
  });

  it('has dialog role and aria-modal', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-labelledby pointing to the title', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const title = document.getElementById(labelId!);
    expect(title).toHaveTextContent('Add Menu Item');
  });

  it('renders search input', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search menu items/i)).toBeInTheDocument();
  });

  it('renders category filter buttons', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Appetizer')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Side')).toBeInTheDocument();
    expect(screen.getByText('Dessert')).toBeInTheDocument();
    expect(screen.getByText('Beverage')).toBeInTheDocument();
  });

  it('renders menu items from query', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
    expect(screen.getByText('Grilled Salmon')).toBeInTheDocument();
    expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
  });

  it('renders item descriptions when present', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    expect(screen.getByText('Classic romaine with croutons')).toBeInTheDocument();
    expect(screen.getByText('Atlantic salmon with herbs')).toBeInTheDocument();
  });

  it('renders cost per person for each item', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    expect(screen.getByText('$8.50/person')).toBeInTheDocument();
    expect(screen.getByText('$24.00/person')).toBeInTheDocument();
    expect(screen.getByText('$12.00/person')).toBeInTheDocument();
  });

  it('shows loading skeleton when data is loading', () => {
    mockIsLoading = true;
    const { container } = render(<AddMenuItemDialog {...defaultProps} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no items match', () => {
    mockItems = [];
    render(<AddMenuItemDialog {...defaultProps} />);
    expect(screen.getByText('No menu items found.')).toBeInTheDocument();
  });

  it('filters items by search text', async () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    await user.type(screen.getByPlaceholderText(/search menu items/i), 'salmon');

    expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
    expect(screen.getByText('Grilled Salmon')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate Cake')).not.toBeInTheDocument();
  });

  it('filters items by search text case-insensitively', async () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    await user.type(screen.getByPlaceholderText(/search menu items/i), 'CAESAR');

    expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
    expect(screen.queryByText('Grilled Salmon')).not.toBeInTheDocument();
  });

  it('calls mutateAsync with correct args when Add button is clicked', async () => {
    render(<AddMenuItemDialog {...defaultProps} />);

    const addButtons = screen.getAllByRole('button', { name: /^add$/i });
    await user.click(addButtons[0]);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        eventMenuId: 1,
        menuItemId: 1,
      });
    });
  });

  it('calls onClose when Done button is clicked', async () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /done/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders dietary tag badges', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    const tags = screen.getAllByTestId('dietary-tag');
    expect(tags.some((t) => t.textContent === 'vegetarian')).toBe(true);
    expect(tags.some((t) => t.textContent === 'gluten-free')).toBe(true);
  });

  it('renders category badges for items', () => {
    render(<AddMenuItemDialog {...defaultProps} />);
    const badges = screen.getAllByTestId('category-badge');
    expect(badges.some((b) => b.textContent === 'appetizer')).toBe(true);
    expect(badges.some((b) => b.textContent === 'main')).toBe(true);
  });

  it('highlights selected category filter', async () => {
    render(<AddMenuItemDialog {...defaultProps} />);

    const mainButton = screen.getByText('Main');
    await user.click(mainButton);

    expect(mainButton.className).toContain('bg-blue-600');
  });
});
