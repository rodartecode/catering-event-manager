const stationTypeConfig: Record<string, { label: string; className: string }> = {
  oven: { label: 'Oven', className: 'bg-red-100 text-red-800' },
  grill: { label: 'Grill', className: 'bg-orange-100 text-orange-800' },
  prep_counter: { label: 'Prep Counter', className: 'bg-blue-100 text-blue-800' },
  cold_storage: { label: 'Cold Storage', className: 'bg-cyan-100 text-cyan-800' },
  stovetop: { label: 'Stovetop', className: 'bg-amber-100 text-amber-800' },
  fryer: { label: 'Fryer', className: 'bg-yellow-100 text-yellow-800' },
  mixer: { label: 'Mixer', className: 'bg-purple-100 text-purple-800' },
};

interface StationTypeBadgeProps {
  type: string;
}

export function StationTypeBadge({ type }: StationTypeBadgeProps) {
  const config = stationTypeConfig[type] ?? { label: type, className: 'bg-gray-100 text-gray-800' };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
