'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { AddMenuItemDialog } from './AddMenuItemDialog';
import { DietaryTagBadge } from './DietaryTagBadge';
import { MenuItemCategoryBadge } from './MenuItemCategoryBadge';

interface EventMenuBuilderProps {
  eventId: number;
  isAdmin: boolean;
}

function formatCurrency(amount: string | number): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function EventMenuBuilder({ eventId, isAdmin }: EventMenuBuilderProps) {
  const utils = trpc.useUtils();
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());
  const [addingToMenuId, setAddingToMenuId] = useState<number | null>(null);
  const [showNewMenuForm, setShowNewMenuForm] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');

  const { data: menus, isLoading } = trpc.menu.listEventMenus.useQuery({ eventId });

  const createMenuMutation = trpc.menu.createEventMenu.useMutation({
    onSuccess: () => {
      utils.menu.listEventMenus.invalidate({ eventId });
      setShowNewMenuForm(false);
      setNewMenuName('');
    },
  });

  const deleteMenuMutation = trpc.menu.deleteEventMenu.useMutation({
    onSuccess: () => {
      utils.menu.listEventMenus.invalidate({ eventId });
      utils.menu.getEventMenuCostEstimate.invalidate({ eventId });
      utils.menu.getEventDietarySummary.invalidate({ eventId });
    },
  });

  const removeItemMutation = trpc.menu.removeItemFromEventMenu.useMutation({
    onSuccess: () => {
      utils.menu.listEventMenus.invalidate({ eventId });
      utils.menu.getEventMenuCostEstimate.invalidate({ eventId });
      utils.menu.getEventDietarySummary.invalidate({ eventId });
    },
  });

  const toggleMenu = (menuId: number) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) next.delete(menuId);
      else next.add(menuId);
      return next;
    });
  };

  const handleCreateMenu = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMenuName.trim()) return;
    createMenuMutation.mutate({ eventId, name: newMenuName.trim() });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && !showNewMenuForm && (
        <button
          type="button"
          onClick={() => setShowNewMenuForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Add Menu
        </button>
      )}

      {showNewMenuForm && (
        <form onSubmit={handleCreateMenu} className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">New Menu</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Menu name (e.g., Dinner Service)"
              value={newMenuName}
              onChange={(e) => setNewMenuName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={createMenuMutation.isPending || !newMenuName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewMenuForm(false);
                setNewMenuName('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!menus || menus.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No menus created yet.</p>
      ) : (
        menus.map((menu) => {
          const isExpanded = expandedMenus.has(menu.id);

          return (
            <div key={menu.id} className="border border-gray-200 rounded-lg">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4">
                <button
                  type="button"
                  onClick={() => toggleMenu(menu.id)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  <svg
                    aria-hidden="true"
                    className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="font-medium text-gray-900">{menu.name}</span>
                  <span className="text-xs text-gray-500">
                    {menu.items.length} item{menu.items.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAddingToMenuId(menu.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Add Items
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${menu.name}" and all its items?`)) {
                          deleteMenuMutation.mutate({ id: menu.id });
                        }
                      }}
                      disabled={deleteMenuMutation.isPending}
                      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Menu Items */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {menu.items.length === 0 ? (
                    <p className="text-sm text-gray-500 p-4">No items in this menu.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 px-4 font-medium text-gray-500">Item</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-500">
                            Category
                          </th>
                          <th className="text-right py-2 px-2 font-medium text-gray-500">
                            Cost/Person
                          </th>
                          <th className="text-right py-2 px-2 font-medium text-gray-500">
                            Qty Override
                          </th>
                          {isAdmin && (
                            <th className="text-right py-2 px-4 font-medium text-gray-500">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {menu.items.map((entry) => (
                          <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 px-4">
                              <div>
                                <span className="text-gray-900">{entry.menuItem.name}</span>
                                {entry.menuItem.dietaryTags &&
                                  entry.menuItem.dietaryTags.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                      {entry.menuItem.dietaryTags.map((tag) => (
                                        <DietaryTagBadge key={tag} tag={tag} />
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <MenuItemCategoryBadge category={entry.menuItem.category} />
                            </td>
                            <td className="py-2 px-2 text-right text-gray-900">
                              {formatCurrency(entry.menuItem.costPerPerson)}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-600">
                              {entry.quantityOverride ?? '-'}
                            </td>
                            {isAdmin && (
                              <td className="py-2 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('Remove this item?')) {
                                      removeItemMutation.mutate({ id: entry.id });
                                    }
                                  }}
                                  disabled={removeItemMutation.isPending}
                                  className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Add Item Dialog */}
      {addingToMenuId !== null && (
        <AddMenuItemDialog
          eventMenuId={addingToMenuId}
          eventId={eventId}
          onClose={() => setAddingToMenuId(null)}
        />
      )}
    </div>
  );
}
