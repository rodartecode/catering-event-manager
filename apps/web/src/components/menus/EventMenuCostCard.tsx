'use client';

import { trpc } from '@/lib/trpc';

interface EventMenuCostCardProps {
  eventId: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function EventMenuCostCard({ eventId }: EventMenuCostCardProps) {
  const { data: estimate, isLoading } = trpc.menu.getEventMenuCostEstimate.useQuery({ eventId });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!estimate || estimate.itemCount === 0) {
    return <p className="text-sm text-gray-500">No menu items added yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-900">
          {formatCurrency(estimate.totalEstimate)}
        </span>
        <span className="text-sm text-gray-500">
          {estimate.itemCount} item{estimate.itemCount !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-xs text-gray-500">
        Based on {estimate.estimatedAttendees} estimated attendees
      </p>

      {estimate.byMenu.length > 0 && (
        <div className="space-y-2">
          {estimate.byMenu.map((menu) => {
            const percentage =
              estimate.totalEstimate > 0
                ? Math.round((menu.total / estimate.totalEstimate) * 100)
                : 0;

            return (
              <div key={menu.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{menu.name}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(menu.total)}</span>
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
      )}
    </div>
  );
}
