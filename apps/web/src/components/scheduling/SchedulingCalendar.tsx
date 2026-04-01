'use client';

import {
  type Announcements,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useScheduleDnd } from '@/hooks/use-schedule-dnd';
import { DEFAULT_GRID_CONFIG, getGridHeight } from '@/hooks/use-snap-to-grid';
import type { ScheduleEntry } from './ScheduleBlock';
import { ScheduleGrid } from './ScheduleGrid';

type ViewMode = 'week' | 'day';

interface Resource {
  id: number;
  name: string;
  type: 'staff' | 'equipment' | 'materials';
}

interface SchedulingCalendarProps {
  resources: Resource[];
  entries: ScheduleEntry[];
  onCreateRequest: (resourceId: number, startTime: Date, endTime: Date) => void;
  onMoveRequest: (entryId: number, startTime: Date, endTime: Date) => void;
  onResizeEntry: (entryId: number, newEndTime: Date) => void;
  onDeleteEntry: (entryId: number) => void;
}

export function SchedulingCalendar({
  resources,
  entries,
  onCreateRequest,
  onMoveRequest,
  onResizeEntry,
  onDeleteEntry,
}: SchedulingCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const config = DEFAULT_GRID_CONFIG;
  const gridHeight = getGridHeight(config);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { dragState, handleDragStart, handleDragEnd, handleDragCancel, handleCreateDrag } =
    useScheduleDnd({
      config,
      onCreateRequest,
      onMoveRequest,
    });

  // Screen reader announcements for drag operations
  const announcements: Announcements = useMemo(
    () => ({
      onDragStart({ active }) {
        const entry = active.data.current?.entry;
        if (entry) {
          return `Picked up ${entry.eventName ?? 'schedule entry'}. Use arrow keys to move, Enter to drop, Escape to cancel.`;
        }
        return 'Picked up schedule entry.';
      },
      onDragEnd({ active, over }) {
        const entry = active.data.current?.entry;
        if (over && entry) {
          return `Dropped ${entry.eventName ?? 'schedule entry'}.`;
        }
        return 'Drag cancelled.';
      },
      onDragCancel() {
        return 'Drag cancelled.';
      },
      onDragOver({ active, over }) {
        const entry = active.data.current?.entry;
        if (over && entry) {
          return `Over drop zone for ${over.data.current?.resourceId ? 'resource' : 'area'}.`;
        }
        return '';
      },
    }),
    []
  );

  // Calculate visible days
  const days = useMemo(() => {
    if (viewMode === 'day') {
      return [viewDate];
    }
    const weekStart = startOfWeek(viewDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [viewDate, viewMode]);

  // Group entries by resource
  const entriesByResource = useMemo(() => {
    const map = new Map<number, ScheduleEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.resourceId) ?? [];
      list.push(entry);
      map.set(entry.resourceId, list);
    }
    return map;
  }, [entries]);

  const navigatePrev = useCallback(() => {
    setViewDate((d) => addDays(d, viewMode === 'week' ? -7 : -1));
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    setViewDate((d) => addDays(d, viewMode === 'week' ? 7 : 1));
  }, [viewMode]);

  const goToToday = useCallback(() => {
    setViewDate(new Date());
  }, []);

  // Generate hour labels
  const hours = Array.from(
    { length: config.endHour - config.startHour },
    (_, i) => config.startHour + i
  );

  const formatHour = (h: number) => {
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  const headerLabel =
    viewMode === 'week'
      ? `${format(days[0], 'MMM d')} - ${format(days[days.length - 1], 'MMM d, yyyy')}`
      : format(viewDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-1.5 hover:bg-gray-100 rounded transition"
            aria-label="Previous"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
          >
            Today
          </button>
          <button
            onClick={navigateNext}
            className="p-1.5 hover:bg-gray-100 rounded transition"
            aria-label="Next"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-gray-800 ml-2">{headerLabel}</h3>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 text-xs rounded-md transition ${
              viewMode === 'day'
                ? 'bg-white shadow text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 text-xs rounded-md transition ${
              viewMode === 'week'
                ? 'bg-white shadow text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          accessibility={{ announcements }}
        >
          <div className="min-w-fit">
            {/* Day headers */}
            <div className="flex sticky top-0 bg-white z-20 border-b border-gray-200">
              {/* Resource name column header */}
              <div className="w-32 min-w-32 flex-shrink-0" />
              {/* Time gutter header */}
              <div className="w-14 min-w-14 flex-shrink-0" />
              {/* Day headers */}
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`flex-1 min-w-28 text-center py-2 border-r border-gray-200 ${
                    isSameDay(day, new Date()) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="text-xs font-medium text-gray-500">{format(day, 'EEE')}</div>
                  <div
                    className={`text-sm ${isSameDay(day, new Date()) ? 'text-blue-600 font-semibold' : 'text-gray-800'}`}
                  >
                    {format(day, 'MMM d')}
                  </div>
                </div>
              ))}
            </div>

            {/* Resource rows */}
            {resources.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">
                  No resources selected. Use the sidebar to select resources.
                </p>
              </div>
            ) : (
              resources.map((resource) => (
                <div key={resource.id} className="flex border-b border-gray-200">
                  {/* Resource label */}
                  <div className="w-32 min-w-32 flex-shrink-0 p-2 bg-gray-50 border-r border-gray-200 sticky left-0 z-10">
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {resource.name}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">{resource.type}</div>
                  </div>

                  {/* Time gutter */}
                  <div
                    className="w-14 min-w-14 flex-shrink-0 border-r border-gray-200 relative"
                    style={{ height: `${gridHeight}px` }}
                  >
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute right-1 text-xs text-gray-400"
                        style={{ top: `${(h - config.startHour) * 2 * config.slotHeight - 6}px` }}
                      >
                        {formatHour(h)}
                      </div>
                    ))}
                  </div>

                  {/* Day grids */}
                  {days.map((day) => (
                    <div key={day.toISOString()} className="flex-1 min-w-28">
                      <ScheduleGrid
                        resourceId={resource.id}
                        resourceName={resource.name}
                        resourceType={resource.type}
                        entries={entriesByResource.get(resource.id) ?? []}
                        day={day}
                        config={config}
                        onCreateDrag={handleCreateDrag}
                        onDeleteEntry={onDeleteEntry}
                        onResizeEntry={onResizeEntry}
                      />
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </DndContext>
      </div>

      {/* Status bar */}
      {dragState.entryId && (
        <div className="p-2 bg-blue-50 border-t border-blue-200 text-xs text-blue-700 text-center">
          Moving: {dragState.originalEntry?.eventName ?? 'Schedule entry'}
        </div>
      )}
    </div>
  );
}
