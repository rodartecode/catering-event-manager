'use client';

import { useDroppable } from '@dnd-kit/core';
import { useCallback, useRef, useState } from 'react';
import type { GridConfig } from '@/hooks/use-snap-to-grid';
import {
  DEFAULT_GRID_CONFIG,
  getGridHeight,
  pixelToTime,
  timeToPixel,
} from '@/hooks/use-snap-to-grid';
import { ScheduleBlock, type ScheduleEntry } from './ScheduleBlock';

interface ScheduleGridProps {
  resourceId: number;
  resourceName: string;
  resourceType: 'staff' | 'equipment' | 'materials';
  entries: ScheduleEntry[];
  day: Date;
  config?: GridConfig;
  onCreateDrag?: (resourceId: number, startTime: Date, endTime: Date) => void;
  onDeleteEntry?: (entryId: number) => void;
  onResizeEntry?: (entryId: number, newEndTime: Date) => void;
}

export function ScheduleGrid({
  resourceId,
  resourceName,
  resourceType,
  entries,
  day,
  config = DEFAULT_GRID_CONFIG,
  onCreateDrag,
  onDeleteEntry,
  onResizeEntry,
}: ScheduleGridProps) {
  const gridHeight = getGridHeight(config);
  const totalSlots = ((config.endHour - config.startHour) * 60) / config.slotMinutes;

  const { setNodeRef, isOver } = useDroppable({
    id: `grid-${resourceId}-${day.toISOString()}`,
    data: {
      type: 'schedule-grid',
      resourceId,
      day,
    },
  });

  // Drag-to-create state
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Drag-to-resize state
  const [resizingEntryId, setResizingEntryId] = useState<number | null>(null);
  const [resizeCurrent, setResizeCurrent] = useState<number | null>(null);

  const getPixelY = useCallback((clientY: number) => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    return clientY - rect.top;
  }, []);

  const handleResizeStart = useCallback(
    (entryId: number) => {
      if (!onResizeEntry) return;
      setResizingEntryId(entryId);
      // resizeCurrent will be set on first mousemove
    },
    [onResizeEntry]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't start create-drag during resize or on existing blocks
      if (resizingEntryId !== null) return;
      if (!onCreateDrag) return;
      if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
      if ((e.target as HTMLElement).closest('[role="button"]')) return;

      const y = getPixelY(e.clientY);
      setDragStart(y);
      setDragCurrent(y);
    },
    [onCreateDrag, getPixelY, resizingEntryId]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (resizingEntryId !== null) {
        setResizeCurrent(getPixelY(e.clientY));
        return;
      }
      if (dragStart === null) return;
      setDragCurrent(getPixelY(e.clientY));
    },
    [dragStart, getPixelY, resizingEntryId]
  );

  const handleMouseUp = useCallback(() => {
    // Handle resize completion
    if (resizingEntryId !== null && resizeCurrent !== null && onResizeEntry) {
      const newEndTime = pixelToTime(resizeCurrent, day, config);
      const entry = entries.find((e) => e.id === resizingEntryId);
      if (entry && newEndTime > entry.startTime) {
        onResizeEntry(resizingEntryId, newEndTime);
      }
      setResizingEntryId(null);
      setResizeCurrent(null);
      return;
    }
    setResizingEntryId(null);
    setResizeCurrent(null);

    // Handle create-drag completion
    if (dragStart === null || dragCurrent === null || !onCreateDrag) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const startY = Math.min(dragStart, dragCurrent);
    const endY = Math.max(dragStart, dragCurrent);

    // Minimum drag distance = half a slot
    if (endY - startY < config.slotHeight / 2) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const startTime = pixelToTime(startY, day, config);
    const endTime = pixelToTime(endY, day, config);

    setDragStart(null);
    setDragCurrent(null);

    if (endTime > startTime) {
      onCreateDrag(resourceId, startTime, endTime);
    }
  }, [
    dragStart,
    dragCurrent,
    onCreateDrag,
    day,
    config,
    resourceId,
    resizingEntryId,
    resizeCurrent,
    onResizeEntry,
    entries,
  ]);

  // Render ghost preview for drag-to-create
  const renderCreateGhost = () => {
    if (dragStart === null || dragCurrent === null) return null;
    const top = Math.min(dragStart, dragCurrent);
    const height = Math.abs(dragCurrent - dragStart);
    if (height < 4) return null;

    return (
      <div
        className="absolute left-0.5 right-0.5 bg-blue-200/50 border-2 border-blue-400 border-dashed rounded pointer-events-none"
        style={{ top: `${top}px`, height: `${height}px` }}
        aria-hidden="true"
      />
    );
  };

  // Render ghost preview for resize
  const renderResizeGhost = () => {
    if (resizingEntryId === null || resizeCurrent === null) return null;
    const entry = entries.find((e) => e.id === resizingEntryId);
    if (!entry || entry.startTime.toDateString() !== day.toDateString()) return null;

    const top = timeToPixel(entry.startTime, config);
    const height = Math.max(resizeCurrent - top, config.slotHeight / 2);

    return (
      <div
        className="absolute left-0.5 right-0.5 bg-blue-200/50 border-2 border-blue-400 border-dashed rounded pointer-events-none"
        style={{ top: `${top}px`, height: `${height}px` }}
        aria-hidden="true"
      />
    );
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        gridRef.current = node;
      }}
      className={`relative border-r border-gray-200 ${isOver ? 'bg-blue-50/50' : ''}`}
      style={{ height: `${gridHeight}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (dragStart !== null) {
          setDragStart(null);
          setDragCurrent(null);
        }
        if (resizingEntryId !== null) {
          setResizingEntryId(null);
          setResizeCurrent(null);
        }
      }}
      aria-label={`Schedule for ${resourceName} on ${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
    >
      {/* Slot grid lines */}
      {Array.from({ length: totalSlots }, (_, i) => (
        <div
          key={i}
          className={`absolute left-0 right-0 border-b ${i % 2 === 0 ? 'border-gray-200' : 'border-gray-100'}`}
          style={{ top: `${i * config.slotHeight}px`, height: `${config.slotHeight}px` }}
        />
      ))}

      {/* Schedule blocks */}
      {entries.map((entry) => {
        const entryDay = new Date(entry.startTime);
        if (entryDay.toDateString() !== day.toDateString()) return null;

        const top = timeToPixel(entry.startTime, config);
        const bottom = timeToPixel(entry.endTime, config);
        const height = bottom - top;

        return (
          <ScheduleBlock
            key={entry.id}
            entry={entry}
            top={top}
            height={
              resizingEntryId === entry.id && resizeCurrent !== null
                ? Math.max(resizeCurrent - top, config.slotHeight / 2)
                : height
            }
            resourceType={resourceType}
            onDelete={onDeleteEntry}
            onResizeStart={handleResizeStart}
          />
        );
      })}

      {/* Create-drag ghost */}
      {renderCreateGhost()}

      {/* Resize ghost */}
      {renderResizeGhost()}
    </div>
  );
}
