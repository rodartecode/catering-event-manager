interface ResourceTypeBadgeProps {
  type: 'staff' | 'equipment' | 'materials';
}

const typeConfig = {
  staff: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    label: 'Staff',
  },
  equipment: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    label: 'Equipment',
  },
  materials: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    label: 'Materials',
  },
};

export function ResourceTypeBadge({ type }: ResourceTypeBadgeProps) {
  const config = typeConfig[type];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
