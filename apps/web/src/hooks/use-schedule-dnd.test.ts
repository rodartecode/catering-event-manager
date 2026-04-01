import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ScheduleEntry } from '@/components/scheduling/ScheduleBlock';
import { useScheduleDnd } from './use-schedule-dnd';

const mockEntry: ScheduleEntry = {
  id: 1,
  resourceId: 10,
  eventId: 100,
  eventName: 'Wedding Reception',
  taskId: null,
  taskTitle: null,
  startTime: new Date('2026-06-15T09:00:00'),
  endTime: new Date('2026-06-15T12:00:00'),
  notes: null,
};

function makeDragStartEvent(entry: ScheduleEntry): DragStartEvent {
  return {
    active: {
      id: `block-${entry.id}`,
      data: { current: { type: 'schedule-block', entry } },
      rect: { current: { initial: null, translated: null } },
    },
  } as unknown as DragStartEvent;
}

function makeDragEndEvent(
  entry: ScheduleEntry,
  deltaY: number,
  overResourceId: number,
  overDay: Date
): DragEndEvent {
  return {
    active: {
      id: `block-${entry.id}`,
      data: { current: { type: 'schedule-block', entry } },
      rect: { current: { initial: null, translated: null } },
    },
    over: {
      id: `grid-${overResourceId}-${overDay.toISOString()}`,
      data: {
        current: {
          type: 'schedule-grid',
          resourceId: overResourceId,
          day: overDay,
        },
      },
      rect: null,
      disabled: false,
    },
    delta: { x: 0, y: deltaY },
    collisions: null,
    activatorEvent: new Event('pointerdown'),
  } as unknown as DragEndEvent;
}

describe('useScheduleDnd', () => {
  it('initializes with empty drag state', () => {
    const { result } = renderHook(() => useScheduleDnd());

    expect(result.current.dragState).toEqual({
      entryId: null,
      operation: null,
      originalEntry: null,
    });
  });

  it('sets drag state on drag start', () => {
    const { result } = renderHook(() => useScheduleDnd());

    act(() => {
      result.current.handleDragStart(makeDragStartEvent(mockEntry));
    });

    expect(result.current.dragState).toEqual({
      entryId: 1,
      operation: 'move',
      originalEntry: mockEntry,
    });
  });

  it('clears drag state on cancel', () => {
    const { result } = renderHook(() => useScheduleDnd());

    act(() => {
      result.current.handleDragStart(makeDragStartEvent(mockEntry));
    });

    act(() => {
      result.current.handleDragCancel();
    });

    expect(result.current.dragState.entryId).toBeNull();
  });

  it('calls onMoveRequest when dropped with delta', () => {
    const onMoveRequest = vi.fn();
    const { result } = renderHook(() => useScheduleDnd({ onMoveRequest }));

    // Start drag
    act(() => {
      result.current.handleDragStart(makeDragStartEvent(mockEntry));
    });

    // End drag - move 1 slot down (50px = 30min)
    const event = makeDragEndEvent(mockEntry, 50, 10, new Date('2026-06-15'));
    act(() => {
      result.current.handleDragEnd(event);
    });

    expect(onMoveRequest).toHaveBeenCalledWith(
      1,
      new Date('2026-06-15T09:30:00'),
      new Date('2026-06-15T12:30:00')
    );
  });

  it('does not call onMoveRequest when delta is zero', () => {
    const onMoveRequest = vi.fn();
    const { result } = renderHook(() => useScheduleDnd({ onMoveRequest }));

    act(() => {
      result.current.handleDragStart(makeDragStartEvent(mockEntry));
    });

    const event = makeDragEndEvent(mockEntry, 0, 10, new Date('2026-06-15'));
    act(() => {
      result.current.handleDragEnd(event);
    });

    expect(onMoveRequest).not.toHaveBeenCalled();
  });

  it('calls handleCreateDrag callback', () => {
    const onCreateRequest = vi.fn();
    const { result } = renderHook(() => useScheduleDnd({ onCreateRequest }));

    act(() => {
      result.current.handleCreateDrag(
        10,
        new Date('2026-06-15T09:00:00'),
        new Date('2026-06-15T10:00:00')
      );
    });

    expect(onCreateRequest).toHaveBeenCalledWith(
      10,
      new Date('2026-06-15T09:00:00'),
      new Date('2026-06-15T10:00:00')
    );
  });
});
