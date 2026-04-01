import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { addMinutes, differenceInMinutes } from 'date-fns';
import { useCallback, useState } from 'react';
import type { ScheduleEntry } from '@/components/scheduling/ScheduleBlock';
import { DEFAULT_GRID_CONFIG, type GridConfig, snapToGrid } from './use-snap-to-grid';

export type DragOperation = 'move' | 'resize' | 'create';

export interface DragState {
  entryId: number | null;
  operation: DragOperation | null;
  originalEntry: ScheduleEntry | null;
}

export interface PendingDrop {
  entryId: number | null;
  resourceId: number;
  startTime: Date;
  endTime: Date;
  operation: DragOperation;
}

interface UseScheduleDndOptions {
  config?: GridConfig;
  onCreateRequest?: (resourceId: number, startTime: Date, endTime: Date) => void;
  onMoveRequest?: (entryId: number, startTime: Date, endTime: Date) => void;
}

export function useScheduleDnd(options: UseScheduleDndOptions = {}) {
  const { config = DEFAULT_GRID_CONFIG, onCreateRequest, onMoveRequest } = options;
  const [dragState, setDragState] = useState<DragState>({
    entryId: null,
    operation: null,
    originalEntry: null,
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'schedule-block') {
      setDragState({
        entryId: data.entry.id,
        operation: 'move',
        originalEntry: data.entry,
      });
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;

      if (!over || !dragState.originalEntry) {
        setDragState({ entryId: null, operation: null, originalEntry: null });
        return;
      }

      const overData = over.data.current;
      if (overData?.type !== 'schedule-grid') {
        setDragState({ entryId: null, operation: null, originalEntry: null });
        return;
      }

      const entry = dragState.originalEntry;
      const duration = differenceInMinutes(entry.endTime, entry.startTime);

      // Calculate new position based on delta
      const deltaY = event.delta.y;
      const slotsMovedRaw = deltaY / config.slotHeight;
      const slotsMoved = Math.round(slotsMovedRaw);
      const minutesMoved = slotsMoved * config.slotMinutes;

      const newStart = addMinutes(entry.startTime, minutesMoved);
      const snappedStart = snapToGrid(newStart, config);
      const snappedEnd = addMinutes(snappedStart, duration);

      if (onMoveRequest && snappedStart.getTime() !== entry.startTime.getTime()) {
        onMoveRequest(entry.id, snappedStart, snappedEnd);
      }

      setDragState({ entryId: null, operation: null, originalEntry: null });
    },
    [dragState, config, onMoveRequest]
  );

  const handleDragCancel = useCallback(() => {
    setDragState({ entryId: null, operation: null, originalEntry: null });
  }, []);

  const handleCreateDrag = useCallback(
    (resourceId: number, startTime: Date, endTime: Date) => {
      if (onCreateRequest) {
        onCreateRequest(resourceId, startTime, endTime);
      }
    },
    [onCreateRequest]
  );

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    handleCreateDrag,
  };
}
