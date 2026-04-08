const prepTypeConfig: Record<string, { label: string; className: string }> = {
  marinate: { label: 'Marinate', className: 'bg-indigo-100 text-indigo-800' },
  bake: { label: 'Bake', className: 'bg-red-100 text-red-800' },
  grill: { label: 'Grill', className: 'bg-orange-100 text-orange-800' },
  plate: { label: 'Plate', className: 'bg-emerald-100 text-emerald-800' },
  chop: { label: 'Chop', className: 'bg-lime-100 text-lime-800' },
  mix: { label: 'Mix', className: 'bg-purple-100 text-purple-800' },
  chill: { label: 'Chill', className: 'bg-cyan-100 text-cyan-800' },
  fry: { label: 'Fry', className: 'bg-yellow-100 text-yellow-800' },
  assemble: { label: 'Assemble', className: 'bg-blue-100 text-blue-800' },
  garnish: { label: 'Garnish', className: 'bg-green-100 text-green-800' },
};

interface PrepTypeBadgeProps {
  type: string;
}

export function PrepTypeBadge({ type }: PrepTypeBadgeProps) {
  const config = prepTypeConfig[type] ?? { label: type, className: 'bg-gray-100 text-gray-800' };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
