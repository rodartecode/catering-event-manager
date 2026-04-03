'use client';

import { useEffect, useRef, useState } from 'react';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';
import { trpc } from '@/lib/trpc';
import { ConflictWarning } from './ConflictWarning';
import { ResourceListItem } from './ResourceListItem';
import { ResourceTypeFilter, type ResourceTypeFilterValue } from './ResourceTypeFilter';
import { TimeRangeEditor } from './TimeRangeEditor';

type ResourceType = 'staff' | 'equipment' | 'materials';

interface ResourceAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  eventId: number;
  startTime: Date;
  endTime: Date;
  allowTimeEdit?: boolean;
  onSuccess?: () => void;
}

interface SelectedResource {
  id: number;
  name: string;
  type: ResourceType;
}
type AvailableResource = SelectedResource & { hourlyRate: string | null };

export function ResourceAssignmentDialog({
  isOpen,
  onClose,
  taskId,
  eventId: _eventId,
  startTime,
  endTime,
  allowTimeEdit = true,
  onSuccess,
}: ResourceAssignmentDialogProps) {
  const [selectedResources, setSelectedResources] = useState<SelectedResource[]>([]);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResourceTypeFilterValue>('');
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [editedStartTime, setEditedStartTime] = useState(startTime);
  const [editedEndTime, setEditedEndTime] = useState(endTime);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('resource-assign-dialog-title');

  const handleClose = () => {
    setSelectedResources([]);
    setResourceTypeFilter('');
    setShowConflictWarning(false);
    onClose();
  };

  useFocusTrap(dialogRef, { isOpen, onClose: handleClose });

  const { data: resources, isLoading: resourcesLoading } = trpc.resource.getAvailable.useQuery(
    { type: resourceTypeFilter || undefined },
    { enabled: isOpen }
  );

  const { data: conflictData, isLoading: conflictsLoading } = trpc.resource.checkConflicts.useQuery(
    {
      resourceIds: selectedResources.map((r) => r.id),
      startTime: editedStartTime,
      endTime: editedEndTime,
    },
    { enabled: isOpen && selectedResources.length > 0 }
  );

  const assignMutation = trpc.task.assignResources.useMutation({
    onSuccess: () => {
      onSuccess?.();
      handleClose();
    },
  });

  const toggleResource = (resource: SelectedResource) => {
    setSelectedResources((prev) => {
      const exists = prev.find((r) => r.id === resource.id);
      return exists ? prev.filter((r) => r.id !== resource.id) : [...prev, resource];
    });
    setShowConflictWarning(false);
  };

  const handleAssign = () => {
    if (editedEndTime <= editedStartTime) return;
    if (conflictData?.hasConflicts && !showConflictWarning) {
      setShowConflictWarning(true);
      return;
    }
    assignMutation.mutate({
      taskId,
      resourceIds: selectedResources.map((r) => r.id),
      startTime: editedStartTime,
      endTime: editedEndTime,
    });
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedResources([]);
      setShowConflictWarning(false);
      setEditedStartTime(startTime);
      setEditedEndTime(endTime);
    }
  }, [isOpen, startTime, endTime]);

  if (!isOpen) return null;

  const hasConflicts = conflictData?.hasConflicts ?? false;
  const conflicts = conflictData?.conflicts ?? [];
  const assignLabel = assignMutation.isPending
    ? 'Assigning...'
    : hasConflicts && showConflictWarning
      ? 'Assign Anyway'
      : conflictsLoading
        ? 'Checking...'
        : 'Assign Resources';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={handleClose}
          aria-hidden="true"
        />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 id={titleId} className="text-xl font-semibold">
                Assign Resources
              </h2>
              <TimeRangeEditor
                startTime={editedStartTime}
                endTime={editedEndTime}
                allowEdit={allowTimeEdit}
                onStartTimeChange={setEditedStartTime}
                onEndTimeChange={setEditedEndTime}
              />
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <ResourceTypeFilter value={resourceTypeFilter} onChange={setResourceTypeFilter} />

            {hasConflicts && showConflictWarning && (
              <div className="mb-4">
                <ConflictWarning
                  conflicts={conflicts}
                  onDismiss={() => setShowConflictWarning(false)}
                />
                <p className="text-sm text-yellow-700 mt-2">
                  Click &quot;Assign Anyway&quot; to proceed despite conflicts.
                </p>
              </div>
            )}

            {conflictData?.warning && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">{conflictData.warning}</p>
              </div>
            )}

            {resourcesLoading ? (
              <div
                className="flex justify-center py-8"
                role="status"
                aria-busy="true"
                aria-label="Loading resources"
              >
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
                  aria-hidden="true"
                />
              </div>
            ) : resources?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No available resources found</div>
            ) : (
              <div className="space-y-2">
                {resources?.map((resource: AvailableResource) => (
                  <ResourceListItem
                    key={resource.id}
                    id={resource.id}
                    name={resource.name}
                    type={resource.type}
                    hourlyRate={resource.hourlyRate}
                    isSelected={selectedResources.some((r) => r.id === resource.id)}
                    hasConflict={conflicts.some((c) => c.resourceId === resource.id)}
                    onToggle={() =>
                      toggleResource({ id: resource.id, name: resource.name, type: resource.type })
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              {selectedResources.length} resource{selectedResources.length !== 1 ? 's' : ''}{' '}
              selected
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={
                  selectedResources.length === 0 ||
                  assignMutation.isPending ||
                  editedEndTime <= editedStartTime
                }
                className={`px-4 py-2 rounded-lg text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasConflicts && showConflictWarning
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {assignLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
