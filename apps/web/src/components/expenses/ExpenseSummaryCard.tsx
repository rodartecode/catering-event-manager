'use client';

import { trpc } from '@/lib/trpc';

interface ExpenseSummaryCardProps {
  eventId: number;
}

const categoryLabels: Record<string, string> = {
  labor: 'Labor',
  food_supplies: 'Food & Supplies',
  equipment_rental: 'Equipment Rental',
  venue: 'Venue',
  transportation: 'Transportation',
  decor: 'Decor',
  beverages: 'Beverages',
  other: 'Other',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function ExpenseSummaryCard({ eventId }: ExpenseSummaryCardProps) {
  const { data: summary, isLoading } = trpc.expense.getEventCostSummary.useQuery({ eventId });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!summary || summary.expenseCount === 0) {
    return <p className="text-sm text-gray-500">No expenses recorded yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-900">
          {formatCurrency(summary.totalExpenses)}
        </span>
        <span className="text-sm text-gray-500">
          {summary.expenseCount} expense{summary.expenseCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {summary.byCategory.map((item) => {
          const percentage =
            summary.totalExpenses > 0 ? Math.round((item.total / summary.totalExpenses) * 100) : 0;

          return (
            <div key={item.category}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {categoryLabels[item.category] || item.category}
                </span>
                <span className="text-gray-900 font-medium">{formatCurrency(item.total)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
