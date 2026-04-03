'use client';

import { useState } from 'react';
import { MenuItemCategoryBadge } from '@/components/menus';
import { trpc } from '@/lib/trpc';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function ShoppingListPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const { data: shoppingList, isLoading } = trpc.menu.getShoppingList.useQuery({
    dateFrom: new Date(dateFrom),
    dateTo: new Date(dateTo),
  });

  const totalCost = shoppingList?.reduce((sum, item) => sum + item.estimatedCost, 0) ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shopping List</h1>

      {/* Date Range */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label
              htmlFor="shopping-list-date-from"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              From
            </label>
            <input
              id="shopping-list-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="shopping-list-date-to"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              To
            </label>
            <input
              id="shopping-list-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {shoppingList && (
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500">Total Estimated Cost</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Shopping List */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      ) : !shoppingList || shoppingList.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No menu items found for events in this date range.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Item</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Category</th>
                <th className="text-right py-3 px-2 font-medium text-gray-500">Total Qty</th>
                <th className="text-right py-3 px-2 font-medium text-gray-500">Est. Cost</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Events</th>
              </tr>
            </thead>
            <tbody>
              {shoppingList.map((item) => (
                <tr key={item.menuItemId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900 font-medium">{item.name}</td>
                  <td className="py-3 px-2">
                    <MenuItemCategoryBadge category={item.category} />
                  </td>
                  <td className="py-3 px-2 text-right text-gray-900">{item.totalQuantity}</td>
                  <td className="py-3 px-2 text-right text-gray-900 font-medium">
                    {formatCurrency(item.estimatedCost)}
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">
                    {item.events.join(', ')}
                    <span className="ml-1 text-gray-400">
                      ({item.eventCount} event{item.eventCount !== 1 ? 's' : ''})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
