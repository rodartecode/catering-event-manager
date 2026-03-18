'use client';

const typeConfig: Record<string, { label: string; className: string }> = {
  contract: { label: 'Contract', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  menu: { label: 'Menu', className: 'bg-green-100 text-green-800 border-green-200' },
  floor_plan: { label: 'Floor Plan', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  permit: { label: 'Permit', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  photo: { label: 'Photo', className: 'bg-pink-100 text-pink-800 border-pink-200' },
};

interface DocumentTypeBadgeProps {
  type: string;
}

export function DocumentTypeBadge({ type }: DocumentTypeBadgeProps) {
  const config = typeConfig[type] || {
    label: type,
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
