'use client';

const tagConfig: Record<string, { label: string; className: string }> = {
  vegan: { label: 'Vegan', className: 'bg-green-100 text-green-800 border-green-200' },
  vegetarian: {
    label: 'Vegetarian',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  gluten_free: { label: 'Gluten Free', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  halal: { label: 'Halal', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  kosher: { label: 'Kosher', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  dairy_free: { label: 'Dairy Free', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  nut_free: { label: 'Nut Free', className: 'bg-red-100 text-red-800 border-red-200' },
};

interface DietaryTagBadgeProps {
  tag: string;
}

export function DietaryTagBadge({ tag }: DietaryTagBadgeProps) {
  const config = tagConfig[tag] || {
    label: tag,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
