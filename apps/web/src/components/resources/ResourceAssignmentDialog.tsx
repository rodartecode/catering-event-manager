'use client';

import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';
import { ConflictWarning } from './ConflictWarning';

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
  type: 'staff' | 'equipment' | 'materials';
}

interface AvailableResource {
  id: number;
  name: string;
  type: 'staff' | 'equipment' | 'materials';
  hourlyRate: string | null;
}

export function ResourceAssignmentDialog({
  isOpen,
  onClose,
  taskId,
  eventId,
  startTime,
  endTime,
  allowTimeEdit = true,
  onSuccess,
}: ResourceAssignmentDialogProps) {
  const [selectedResources, setSelectedResources] = useState<SelectedResource[]>([]);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'staff' | 'equipment' | 'materials' | ''>('');
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [editedStartTime, setEditedStartTime] = useState(startTime);
  const [editedEndTime, setEditedEndTime] = useState(endTime);

  // Helper to format Date for datetime-local input
  const formatDateTimeLocal = (date: Date) => {
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  // Fetch available resources
  const { data: resources, isLoading: resourcesLoading } = trpc.resource.getAvailable.useQuery(
    { type: resourceTypeFilter || undefined },
    { enabled: isOpen }
  );

  // Check conflicts when resources are selected
  const { data: conflictData, isLoading: conflictsLoading } = trpc.resource.checkConflicts.useQuery(
    {
      resourceIds: selectedResources.map((r) => r.id),
      startTime: editedStartTime,
      endTime: editedEndTime,
    },
    {
      enabled: isOpen && selectedResources.length > 0,
    }
  );

  // Assign resources mutation
  const assignMutation = trpc.task.assignResources.useMutation({
    onSuccess: () => {
      onSuccess?.();
      handleClose();
    },
  });

  const handleClose = () => {
    setSelectedResources([]);
    setResourceTypeFilter('');
    setShowConflictWarning(false);
    onClose();
  };

  const toggleResource = (resource: SelectedResource) => {
    setSelectedResources((prev) => {
      const exists = prev.find((r) => r.id === resource.id);
      if (exists) {
        return prev.filter((r) => r.id !== resource.id);
      }
      return [...prev, resource];
    });
    setShowConflictWarning(false);
  };

  const handleAssign = () => {
    // Validate time range
    if (editedEndTime <= editedStartTime) {
      return;
    }

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

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedResources([]);
      setShowConflictWarning(false);
      setEditedStartTime(startTime);
      setEditedEndTime(endTime);
    }
  }, [isOpen, startTime, endTime]);

  if (!isOpen) return null;

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose} />

        {/* Dialog */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold">Assign Resources</h2>
              {allowTimeEdit ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <label className="text-sm text-gray-500">From:</label>
                    <input
                      type="datetime-local"
                      value={formatDateTimeLocal(editedStartTime)}
                      onChange={(e) => setEditedStartTime(new Date(e.target.value))}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-sm text-gray-500">To:</label>
                    <input
                      type="datetime-local"
                      value={formatDateTimeLocal(editedEndTime)}
                      onChange={(e) => setEditedEndTime(new Date(e.target.value))}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {editedEndTime <= editedStartTime && (
                    <p className="text-sm text-red-600 w-full">End time must be after start time</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  {formatDateTime(editedStartTime)} - {formatDateTime(editedEndTime)}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {/* Type Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setResourceTypeFilter('')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    resourceTypeFilter === ''
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setResourceTypeFilter('staff')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    resourceTypeFilter === 'staff'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  Staff
                </button>
                <button
                  onClick={() => setResourceTypeFilter('equipment')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    resourceTypeFilter === 'equipment'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  Equipment
                </button>
                <button
                  onClick={() => setResourceTypeFilter('materials')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    resourceTypeFilter === 'materials'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  Materials
                </button>
              </div>
            </div>

            {/* Conflict Warning */}
            {conflictData?.hasConflicts && showConflictWarning && (
              <div className="mb-4">
                <ConflictWarning
                  conflicts={conflictData.conflicts}
                  onDismiss={() => setShowConflictWarning(false)}
                />
                <p className="text-sm text-yellow-700 mt-2">
                  Click &quot;Assign Anyway&quot; to proceed despite conflicts.
                </p>
              </div>
            )}

            {/* Service Unavailable Warning */}
            {conflictData?.warning && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">{conflictData.warning}</p>
              </div>
            )}

            {/* Resource List */}
            {resourcesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : resources?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No available resources found
              </div>
            ) : (
              <div className="space-y-2">
                {resources?.map((resource: AvailableResource) => {
                  const isSelected = selectedResources.some((r) => r.id === resource.id);
                  const hasConflict = conflictData?.conflicts.some(
                    (c) => c.resourceId === resource.id
                  );

                  return (
                    <button
                      key={resource.id}
                      onClick={() =>
                        toggleResource({
                          id: resource.id,
                          name: resource.name,
                          type: resource.type,
                        })
                      }
                      className={`w-full p-3 rounded-lg border text-left transition ${
                        isSelected
                          ? hasConflict
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{resource.name}</div>
                            <div className="text-sm text-gray-500 capitalize">
                              {resource.type}
                              {resource.hourlyRate && ` • $${resource.hourlyRate}/hr`}
                            </div>
                          </div>
                        </div>
                        {hasConflict && isSelected && (
                          <span className="text-yellow-600 text-sm">Has conflict</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              {selectedResources.length} resource{selectedResources.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={selectedResources.length === 0 || assignMutation.isPending || editedEndTime <= editedStartTime}
                className={`px-4 py-2 rounded-lg text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  conflictData?.hasConflicts && showConflictWarning
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {assignMutation.isPending
                  ? 'Assigning...'
                  : conflictData?.hasConflicts && showConflictWarning
                  ? 'Assign Anyway'
                  : conflictsLoading
                  ? 'Checking...'
                  : 'Assign Resources'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
