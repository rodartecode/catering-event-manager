'use client';

import { useMemo } from 'react';
import {
  computeGanttLayout,
  GANTT_HEADER_HEIGHT,
  GANTT_ROW_HEIGHT,
  type GanttTask,
} from '@/lib/gantt-layout';
import { trpc } from '@/lib/trpc';
import { GanttBar } from './GanttBar';
import { GanttDependencyArrows } from './GanttDependencyArrows';

interface GanttChartProps {
  eventId: number;
  eventDate: Date;
  onTaskClick?: (taskId: number) => void;
}

const categoryLabels: Record<string, string> = {
  pre_event: 'Pre-Event',
  during_event: 'During Event',
  post_event: 'Post-Event',
};

export function GanttChart({ eventId, eventDate, onTaskClick }: GanttChartProps) {
  const { data, isLoading, error } = trpc.task.listByEvent.useQuery({
    eventId,
    status: 'all',
    category: 'all',
    overdueOnly: false,
  });

  const tasks: GanttTask[] = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as GanttTask['status'],
      category: t.category as GanttTask['category'],
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      dependsOnTaskId: t.dependsOnTaskId,
      assignee: t.assignee ? { name: t.assignee.name } : null,
    }));
  }, [data?.items]);

  const layout = useMemo(() => computeGanttLayout(tasks, new Date(eventDate)), [tasks, eventDate]);

  const handleTaskClick = (taskId: number) => {
    onTaskClick?.(taskId);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">Failed to load timeline data.</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">No tasks to display on timeline.</div>
    );
  }

  // Build label rows for the left column
  const labelRows = layout.bars.map((bar) => ({
    id: bar.id,
    title: bar.title,
    category: bar.category,
    row: bar.row,
  }));

  const LABEL_WIDTH = 160;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gray-200 border border-gray-400" />
          Pending
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-blue-200 border border-blue-500" />
          In Progress
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-500" />
          Completed
        </span>
        {layout.criticalPathIds.size > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-amber-100 ring-2 ring-amber-400" />
            Critical Path
          </span>
        )}
      </div>

      <div className="flex">
        {/* Task labels (sticky left) */}
        <div
          className="flex-shrink-0 bg-white border-r border-gray-200 z-10"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Header spacer */}
          <div
            className="border-b border-gray-200 bg-gray-50 px-2 flex items-center text-xs font-medium text-gray-500"
            style={{ height: GANTT_HEADER_HEIGHT }}
          >
            Task
          </div>
          {/* Task names */}
          {labelRows.map((row) => (
            <div
              key={row.id}
              className="border-b border-gray-100 px-2 flex items-center text-xs truncate"
              style={{ height: GANTT_ROW_HEIGHT }}
              title={`${row.title} (${categoryLabels[row.category] ?? row.category})`}
            >
              <span className="truncate text-gray-800">{row.title}</span>
            </div>
          ))}
        </div>

        {/* Scrollable chart area */}
        <div className="overflow-x-auto flex-1">
          <div
            className="relative"
            style={{
              width: layout.totalWidth,
              height: layout.totalHeight,
            }}
          >
            {/* Date column headers */}
            <div
              className="flex border-b border-gray-200 bg-gray-50"
              style={{ height: GANTT_HEADER_HEIGHT }}
            >
              {layout.columns.map((col) => (
                <div
                  key={col.date.getTime()}
                  className={`flex-shrink-0 text-xs text-center flex items-center justify-center border-r border-gray-100
                    ${col.isEventDate ? 'font-semibold text-red-600 bg-red-50' : 'text-gray-500'}`}
                  style={{ width: col.width }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Row backgrounds with alternating stripes */}
            {labelRows.map((row) => (
              <div
                key={`row-bg-${row.id}`}
                className={`absolute left-0 right-0 border-b border-gray-50 ${row.row % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                style={{
                  top: GANTT_HEADER_HEIGHT + row.row * GANTT_ROW_HEIGHT,
                  height: GANTT_ROW_HEIGHT,
                }}
              />
            ))}

            {/* Event date vertical marker */}
            {layout.eventDateX !== null && (
              <div
                className="absolute bg-red-400/30 w-px z-0"
                style={{
                  left: layout.eventDateX,
                  top: GANTT_HEADER_HEIGHT,
                  height: layout.totalHeight - GANTT_HEADER_HEIGHT,
                }}
              />
            )}

            {/* Dependency arrows */}
            <GanttDependencyArrows
              arrows={layout.arrows}
              width={layout.totalWidth}
              height={layout.totalHeight}
            />

            {/* Task bars */}
            {layout.bars.map((bar) => (
              <GanttBar key={bar.id} bar={bar} onClick={handleTaskClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
