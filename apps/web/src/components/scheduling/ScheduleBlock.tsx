'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export interface ScheduleEntry {
  id: number;
  resourceId: number;
  eventId: number;
  eventName: string | null;
  taskId: number | null;
  taskTitle: string | null;
  startTime: Date;
  endTime: Date;
  notes: string | null;
}

interface ScheduleBlockProps {
  entry: ScheduleEntry;
  top: number;
  height: number;
  resourceType?: 'staff' | 'equipment' | 'materials';
  onDelete?: (entryId: number) => void;
  onResizeStart?: (entryId: number) => void;
}

const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  staff: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  equipment: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  materials: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
};

export function ScheduleBlock({
  entry,
  top,
  height,
  resourceType = 'staff',
  onDelete,
  onResizeStart,
}: ScheduleBlockProps) {
  const colors = typeColors[resourceType] ?? typeColors.staff;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${entry.id}`,
    data: {
      type: 'schedule-block',
      entry,
    },
  });

  const style = {
    position: 'absolute' as const,
    top: `${top}px`,
    height: `${Math.max(height, 24)}px`,
    left: '2px',
    right: '2px',
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 10,
  };

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${hour12}${period}` : `${hour12}:${m.toString().padStart(2, '0')}${period}`;
  };

  const timeLabel = `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${colors.bg} ${colors.border} border rounded px-1.5 py-0.5 overflow-hidden cursor-grab active:cursor-grabbing select-none group ${isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}`}
      {...listeners}
      {...attributes}
      aria-label={`${entry.eventName ?? 'Event'}, ${timeLabel}`}
    >
      <div className={`text-xs font-medium truncate ${colors.text}`}>
        {entry.eventName ?? 'Unknown Event'}
      </div>
      {height >= 40 && entry.taskTitle && (
        <div className="text-xs truncate text-gray-600">{entry.taskTitle}</div>
      )}
      {height >= 56 && <div className="text-xs text-gray-500">{timeLabel}</div>}

      {/* Resize handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 bg-gray-400/30 rounded-b"
        data-resize-handle="true"
        aria-hidden="true"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart?.(entry.id);
        }}
      />

      {/* Delete button (visible on hover) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(entry.id);
          }}
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-600"
          aria-label={`Delete schedule entry for ${entry.eventName}`}
        >
          &times;
        </button>
      )}
    </div>
  );
}
