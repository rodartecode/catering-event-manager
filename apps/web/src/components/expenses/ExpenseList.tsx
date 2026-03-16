'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ExpenseForm } from './ExpenseForm';

interface ExpenseListProps {
  eventId: number;
  isAdmin: boolean;
}

const categoryConfig: Record<string, { label: string; className: string }> = {
  labor: { label: 'Labor', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  food_supplies: {
    label: 'Food & Supplies',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  equipment_rental: {
    label: 'Equipment',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  venue: { label: 'Venue', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  transportation: { label: 'Transport', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  decor: { label: 'Decor', className: 'bg-pink-100 text-pink-800 border-pink-200' },
  beverages: { label: 'Beverages', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  other: { label: 'Other', className: 'bg-gray-100 text-gray-800 border-gray-200' },
};

function formatCurrency(amount: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    parseFloat(amount)
  );
}

export function ExpenseList({ eventId, isAdmin }: ExpenseListProps) {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<{
    id: number;
    category: string;
    description: string;
    amount: string;
    vendor: string | null;
    expenseDate: Date;
    notes: string | null;
  } | null>(null);

  const { data: expenses, isLoading } = trpc.expense.listByEvent.useQuery({ eventId });

  const deleteMutation = trpc.expense.delete.useMutation({
    onSuccess: () => {
      utils.expense.listByEvent.invalidate({ eventId });
      utils.expense.getEventCostSummary.invalidate({ eventId });
    },
  });

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
      {isAdmin && !showForm && !editingExpense && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Add Expense
        </button>
      )}

      {showForm && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">New Expense</h3>
          <ExpenseForm
            eventId={eventId}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {editingExpense && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Edit Expense</h3>
          <ExpenseForm
            eventId={eventId}
            expense={editingExpense}
            onSuccess={() => setEditingExpense(null)}
            onCancel={() => setEditingExpense(null)}
          />
        </div>
      )}

      {!expenses || expenses.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No expenses recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-500">Date</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500">Category</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500">Description</th>
                <th className="text-left py-2 px-2 font-medium text-gray-500">Vendor</th>
                <th className="text-right py-2 px-2 font-medium text-gray-500">Amount</th>
                {isAdmin && (
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => {
                const config = categoryConfig[expense.category] || categoryConfig.other;

                return (
                  <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-600">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
                      >
                        {config.label}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-900">{expense.description}</td>
                    <td className="py-2 px-2 text-gray-600">{expense.vendor || '-'}</td>
                    <td className="py-2 px-2 text-right text-gray-900 font-medium">
                      {formatCurrency(expense.amount)}
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingExpense({
                                id: expense.id,
                                category: expense.category,
                                description: expense.description,
                                amount: expense.amount,
                                vendor: expense.vendor,
                                expenseDate: expense.expenseDate,
                                notes: expense.notes,
                              })
                            }
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Delete this expense?')) {
                                deleteMutation.mutate({ id: expense.id });
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
