'use client';

import { useRef } from 'react';
import { useDialogId, useFocusTrap } from '@/hooks/use-focus-trap';

interface Conflict {
  resourceName: string;
  conflictingEventName: string;
  message: string;
}

interface ScheduleConflictDialogProps {
  conflicts: Conflict[];
  onForce: () => void;
  onCancel: () => void;
}

export function ScheduleConflictDialog({
  conflicts,
  onForce,
  onCancel,
}: ScheduleConflictDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useDialogId('schedule-conflict');
  useFocusTrap(dialogRef, { isOpen: true, onClose: onCancel });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg
              aria-hidden="true"
              className="w-5 h-5 text-amber-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <h2 id={titleId} className="text-lg font-semibold text-gray-800">
              Scheduling Conflict
            </h2>
          </div>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600 mb-3">The following conflicts were detected:</p>

          <ul className="space-y-2">
            {conflicts.map((conflict, i) => (
              <li key={i} className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                <div className="font-medium text-amber-800">{conflict.resourceName}</div>
                <div className="text-amber-700">{conflict.message}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onForce}
            className="px-4 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition"
          >
            Assign Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
