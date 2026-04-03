import {
  GANTT_BAR_HEIGHT,
  GANTT_HEADER_HEIGHT,
  GANTT_ROW_HEIGHT,
  type GanttBar as GanttBarType,
} from '@/lib/gantt-layout';

interface GanttBarProps {
  bar: GanttBarType;
  onClick: (taskId: number) => void;
}

const statusColors = {
  pending: 'bg-gray-200 border-gray-400 text-gray-800',
  in_progress: 'bg-blue-200 border-blue-500 text-blue-900',
  completed: 'bg-green-200 border-green-500 text-green-900',
};

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export function GanttBar({ bar, onClick }: GanttBarProps) {
  const top =
    GANTT_HEADER_HEIGHT + bar.row * GANTT_ROW_HEIGHT + (GANTT_ROW_HEIGHT - GANTT_BAR_HEIGHT) / 2;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(bar.id);
    }
  };

  const dueDateLabel = bar.dueDate
    ? new Date(bar.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'No date';

  return (
    <button
      type="button"
      aria-label={`Task: ${bar.title}, Status: ${statusLabels[bar.status]}, Due: ${dueDateLabel}`}
      className={`absolute rounded border text-xs font-medium px-2 flex items-center cursor-pointer
        hover:opacity-80 transition-opacity select-none truncate
        ${statusColors[bar.status]}
        ${bar.isCriticalPath ? 'ring-2 ring-amber-400' : ''}
        ${!bar.hasDueDate ? 'border-dashed' : ''}`}
      style={{
        left: bar.left,
        top,
        width: bar.width,
        height: GANTT_BAR_HEIGHT,
      }}
      onClick={() => onClick(bar.id)}
      onKeyDown={handleKeyDown}
      title={`${bar.title}${bar.assigneeName ? ` — ${bar.assigneeName}` : ''}\n${statusLabels[bar.status]} · ${dueDateLabel}`}
    >
      <span className="truncate">{bar.title}</span>
    </button>
  );
}
