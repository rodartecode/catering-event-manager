'use client';

import { addDays, endOfWeek, startOfWeek } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CreateEntryDialog } from '@/components/scheduling/CreateEntryDialog';
import { ResourceFilterSidebar } from '@/components/scheduling/ResourceFilterSidebar';
import { ScheduleConflictDialog } from '@/components/scheduling/ScheduleConflictDialog';
import { SchedulingCalendar } from '@/components/scheduling/SchedulingCalendar';
import { trpc } from '@/lib/trpc';
import { useIsAdmin } from '@/lib/use-auth';

interface PendingCreate {
  resourceId: number;
  startTime: Date;
  endTime: Date;
}

interface ConflictInfo {
  entryId: number | null;
  resourceId: number;
  startTime: Date;
  endTime: Date;
  conflicts: Array<{ resourceName: string; conflictingEventName: string; message: string }>;
  operation: 'create' | 'move';
  eventId?: number;
}

export default function SchedulingPage() {
  const { isAdmin } = useIsAdmin();
  const utils = trpc.useUtils();

  // View state
  const [viewDate] = useState(new Date());

  // Filter state
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<number>>(new Set());

  // Dialog state
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  // Date range for queries
  const dateRange = useMemo(() => {
    const start = startOfWeek(viewDate, { weekStartsOn: 0 });
    const end = endOfWeek(viewDate, { weekStartsOn: 0 });
    return {
      startDate: start,
      endDate: addDays(end, 1), // Include full last day
    };
  }, [viewDate]);

  // Fetch all resources
  const resourcesQuery = trpc.resource.list.useQuery({ limit: 100 });

  // Fetch schedule entries for selected resources
  const resourceIds = useMemo(() => Array.from(selectedResourceIds), [selectedResourceIds]);
  const scheduleQuery = trpc.resource.getMultiResourceSchedule.useQuery(
    { resourceIds, ...dateRange },
    { enabled: resourceIds.length > 0 }
  );

  // Fetch non-archived events for the create dialog
  const eventsQuery = trpc.event.list.useInfiniteQuery(
    { status: undefined, limit: 100 },
    { getNextPageParam: (last) => last.nextCursor }
  );

  // Mutations
  const createEntry = trpc.resource.createScheduleEntry.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        utils.resource.getMultiResourceSchedule.invalidate();
        toast.success('Schedule entry created');
      } else if (data.conflicts && data.conflicts.length > 0) {
        setConflictInfo({
          entryId: null,
          resourceId: pendingCreate?.resourceId ?? 0,
          startTime: pendingCreate?.startTime ?? new Date(),
          endTime: pendingCreate?.endTime ?? new Date(),
          conflicts: data.conflicts,
          operation: 'create',
          eventId: undefined,
        });
      } else if (data.warning) {
        toast(data.warning, { icon: '⚠️' });
      }
      setPendingCreate(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingCreate(null);
    },
  });

  const updateEntry = trpc.resource.updateScheduleEntry.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        utils.resource.getMultiResourceSchedule.invalidate();
        toast.success('Schedule entry updated');
      } else if (data.conflicts && data.conflicts.length > 0) {
        setConflictInfo({
          entryId: data.conflicts[0]?.resourceId ?? 0,
          resourceId: 0,
          startTime: new Date(),
          endTime: new Date(),
          conflicts: data.conflicts,
          operation: 'move',
        });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteEntry = trpc.resource.deleteScheduleEntry.useMutation({
    onSuccess: () => {
      utils.resource.getMultiResourceSchedule.invalidate();
      toast.success('Schedule entry deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  // Resource filter handlers
  const allResources = resourcesQuery.data?.items ?? [];

  // Auto-select all resources on first load
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && allResources.length > 0) {
      initializedRef.current = true;
      setSelectedResourceIds(new Set(allResources.map((r) => r.id)));
    }
  }, [allResources]);

  const toggleResource = useCallback((id: number) => {
    setSelectedResourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllResources = useCallback(() => {
    setSelectedResourceIds(new Set(allResources.map((r) => r.id)));
  }, [allResources]);

  const deselectAllResources = useCallback(() => {
    setSelectedResourceIds(new Set());
  }, []);

  // Calendar action handlers
  const handleCreateRequest = useCallback(
    (resourceId: number, startTime: Date, endTime: Date) => {
      if (!isAdmin) return;
      setPendingCreate({ resourceId, startTime, endTime });
    },
    [isAdmin]
  );

  const handleMoveRequest = useCallback(
    (entryId: number, startTime: Date, endTime: Date) => {
      if (!isAdmin) return;
      updateEntry.mutate({ scheduleId: entryId, startTime, endTime });
    },
    [isAdmin, updateEntry]
  );

  const handleResizeEntry = useCallback(
    (entryId: number, newEndTime: Date) => {
      if (!isAdmin) return;
      const entries = scheduleQuery.data?.entries ?? [];
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      updateEntry.mutate({
        scheduleId: entryId,
        startTime: new Date(entry.startTime),
        endTime: newEndTime,
      });
    },
    [isAdmin, updateEntry, scheduleQuery.data]
  );

  const handleDeleteEntry = useCallback(
    (entryId: number) => {
      if (!isAdmin) return;
      if (confirm('Delete this schedule entry?')) {
        deleteEntry.mutate({ scheduleId: entryId });
      }
    },
    [isAdmin, deleteEntry]
  );

  const handleCreateConfirm = useCallback(
    (eventId: number, taskId?: number) => {
      if (!pendingCreate) return;
      createEntry.mutate({
        resourceId: pendingCreate.resourceId,
        eventId,
        taskId,
        startTime: pendingCreate.startTime,
        endTime: pendingCreate.endTime,
      });
    },
    [pendingCreate, createEntry]
  );

  const handleForceCreate = useCallback(() => {
    if (!conflictInfo?.eventId) {
      setConflictInfo(null);
      return;
    }
    createEntry.mutate({
      resourceId: conflictInfo.resourceId,
      eventId: conflictInfo.eventId,
      startTime: conflictInfo.startTime,
      endTime: conflictInfo.endTime,
      force: true,
    });
    setConflictInfo(null);
  }, [conflictInfo, createEntry]);

  const handleForceMove = useCallback(() => {
    if (!conflictInfo?.entryId) {
      setConflictInfo(null);
      return;
    }
    updateEntry.mutate({
      scheduleId: conflictInfo.entryId,
      startTime: conflictInfo.startTime,
      endTime: conflictInfo.endTime,
      force: true,
    });
    setConflictInfo(null);
  }, [conflictInfo, updateEntry]);

  // Build calendar entries with proper Date objects
  const calendarEntries = useMemo(() => {
    return (scheduleQuery.data?.entries ?? []).map((e) => ({
      ...e,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
    }));
  }, [scheduleQuery.data]);

  // Build selected resources list
  const selectedResources = useMemo(() => {
    return allResources
      .filter((r) => selectedResourceIds.has(r.id))
      .map((r) => ({ id: r.id, name: r.name, type: r.type }));
  }, [allResources, selectedResourceIds]);

  // Events for CreateEntryDialog
  const eventOptions = useMemo(() => {
    const pages = eventsQuery.data?.pages ?? [];
    return pages.flatMap((p) => p.items.map((e) => ({ id: e.id, name: e.eventName })));
  }, [eventsQuery.data]);

  if (resourcesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <ResourceFilterSidebar
        resources={allResources}
        selectedIds={selectedResourceIds}
        onToggleResource={toggleResource}
        onSelectAll={selectAllResources}
        onDeselectAll={deselectAllResources}
      />

      {/* Calendar */}
      <div className="flex-1 min-w-0">
        <SchedulingCalendar
          resources={selectedResources}
          entries={calendarEntries}
          onCreateRequest={handleCreateRequest}
          onMoveRequest={handleMoveRequest}
          onResizeEntry={handleResizeEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      </div>

      {/* Create Entry Dialog */}
      {pendingCreate && (
        <CreateEntryDialog
          events={eventOptions}
          startTime={pendingCreate.startTime}
          endTime={pendingCreate.endTime}
          onConfirm={handleCreateConfirm}
          onCancel={() => setPendingCreate(null)}
        />
      )}

      {/* Conflict Dialog */}
      {conflictInfo && (
        <ScheduleConflictDialog
          conflicts={conflictInfo.conflicts}
          onForce={conflictInfo.operation === 'create' ? handleForceCreate : handleForceMove}
          onCancel={() => setConflictInfo(null)}
        />
      )}
    </div>
  );
}
