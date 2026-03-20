'use client';

import { useRef, useState } from 'react';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';
import { trpc } from '@/lib/trpc';
import { DietaryTagBadge } from './DietaryTagBadge';
import { MenuItemCategoryBadge } from './MenuItemCategoryBadge';

interface AddMenuItemDialogProps {
  eventMenuId: number;
  eventId: number;
  onClose: () => void;
}

export function AddMenuItemDialog({ eventMenuId, eventId, onClose }: AddMenuItemDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('add-menu-item-title');
  useFocusTrap(dialogRef, { isOpen: true, onClose });

  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  type MenuCategory = 'appetizer' | 'main' | 'side' | 'dessert' | 'beverage';
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | ''>('');

  const { data: items, isLoading } = trpc.menu.listItems.useQuery({
    activeOnly: true,
    category: selectedCategory || undefined,
  });

  const addMutation = trpc.menu.addItemToEventMenu.useMutation({
    onSuccess: () => {
      utils.menu.listEventMenus.invalidate({ eventId });
      utils.menu.getEventMenuCostEstimate.invalidate({ eventId });
      utils.menu.getEventDietarySummary.invalidate({ eventId });
    },
  });

  const filteredItems =
    items?.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  const handleAdd = async (menuItemId: number) => {
    await addMutation.mutateAsync({ eventMenuId, menuItemId });
  };

  const categories: (MenuCategory | '')[] = [
    '',
    'appetizer',
    'main',
    'side',
    'dessert',
    'beverage',
  ];
  const categoryLabels: Record<string, string> = {
    '': 'All',
    appetizer: 'Appetizer',
    main: 'Main',
    side: 'Side',
    dessert: 'Dessert',
    beverage: 'Beverage',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
      >
        <h3 id={titleId} className="text-xl font-semibold mb-4">
          Add Menu Item
        </h3>

        {/* Search and Filter */}
        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No menu items found.</p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate">{item.name}</span>
                    <MenuItemCategoryBadge category={item.category} />
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <span className="text-xs text-gray-600 font-medium">
                      ${parseFloat(item.costPerPerson).toFixed(2)}/person
                    </span>
                    {item.dietaryTags?.map((tag) => (
                      <DietaryTagBadge key={tag} tag={tag} />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(item.id)}
                  disabled={addMutation.isPending}
                  className="ml-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
