'use client';

import { trpc } from '@/lib/trpc';
import { DietaryTagBadge } from './DietaryTagBadge';

interface EventDietarySummaryProps {
  eventId: number;
}

export function EventDietarySummary({ eventId }: EventDietarySummaryProps) {
  const { data: summary, isLoading } = trpc.menu.getEventDietarySummary.useQuery({ eventId });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!summary || summary.itemCount === 0) {
    return <p className="text-sm text-gray-500">No menu items added yet.</p>;
  }

  const hasAllergens = summary.allergens.length > 0;
  const hasDietaryTags = summary.dietaryTags.length > 0;

  if (!hasAllergens && !hasDietaryTags) {
    return (
      <p className="text-sm text-gray-500">
        No allergens or dietary restrictions noted across {summary.itemCount} item
        {summary.itemCount !== 1 ? 's' : ''}.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hasDietaryTags && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Dietary Options
          </h4>
          <div className="flex flex-wrap gap-1">
            {summary.dietaryTags.map((tag) => (
              <DietaryTagBadge key={tag} tag={tag} />
            ))}
          </div>
        </div>
      )}

      {hasAllergens && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Allergens Present
          </h4>
          <div className="flex flex-wrap gap-1">
            {summary.allergens.map((allergen) => (
              <span
                key={allergen}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200"
              >
                {allergen}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Across {summary.itemCount} menu item{summary.itemCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
