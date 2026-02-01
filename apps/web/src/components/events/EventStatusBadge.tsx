interface EventStatusBadgeProps {
  status: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up';
}

const statusConfig = {
  inquiry: {
    label: 'Inquiry',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  planning: {
    label: 'Planning',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  preparation: {
    label: 'Preparation',
    className: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  follow_up: {
    label: 'Follow Up',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
};

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
