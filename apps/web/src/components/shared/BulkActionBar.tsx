'use client';

interface BulkActionBarProps {
  count: number;
  entityLabel: string;
  onUpdateStatus: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, entityLabel, onUpdateStatus, onClear }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {count} {entityLabel}
          {count !== 1 ? 's' : ''} selected
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onClear}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Clear Selection
          </button>
          <button
            onClick={onUpdateStatus}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
}
