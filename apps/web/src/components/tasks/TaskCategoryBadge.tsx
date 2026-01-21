interface TaskCategoryBadgeProps {
  category: 'pre_event' | 'during_event' | 'post_event';
}

const categoryConfig = {
  pre_event: {
    label: 'Pre-Event',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  during_event: {
    label: 'During Event',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  post_event: {
    label: 'Post-Event',
    className: 'bg-teal-100 text-teal-800 border-teal-200',
  },
};

export function TaskCategoryBadge({ category }: TaskCategoryBadgeProps) {
  const config = categoryConfig[category];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
