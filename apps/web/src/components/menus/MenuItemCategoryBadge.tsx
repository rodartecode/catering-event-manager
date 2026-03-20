'use client';

const categoryConfig: Record<string, { label: string; className: string }> = {
  appetizer: { label: 'Appetizer', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  main: { label: 'Main', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  side: { label: 'Side', className: 'bg-green-100 text-green-800 border-green-200' },
  dessert: { label: 'Dessert', className: 'bg-pink-100 text-pink-800 border-pink-200' },
  beverage: { label: 'Beverage', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
};

interface MenuItemCategoryBadgeProps {
  category: string;
}

export function MenuItemCategoryBadge({ category }: MenuItemCategoryBadgeProps) {
  const config = categoryConfig[category] || {
    label: category,
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
