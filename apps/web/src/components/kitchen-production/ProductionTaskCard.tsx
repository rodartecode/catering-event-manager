'use client';

import { PrepTypeBadge } from './PrepTypeBadge';

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Done', className: 'bg-green-100 text-green-800' },
  skipped: { label: 'Skipped', className: 'bg-yellow-100 text-yellow-800' },
};

interface ProductionTaskCardProps {
  task: {
    id: number;
    name: string;
    prepType: string;
    status: string;
    durationMinutes: number;
    offsetMinutes: number;
    scheduledStart: Date | string | null;
    servings: number | null;
    notes: string | null;
  };
  stationName?: string | null;
  assignedToName?: string | null;
  onStatusChange?: (id: number, status: string) => void;
}

function formatOffset(minutes: number): string {
  const absMinutes = Math.abs(minutes);
  if (absMinutes >= 1440) {
    const days = Math.floor(absMinutes / 1440);
    const remainingHours = Math.floor((absMinutes % 1440) / 60);
    return remainingHours > 0 ? `${days}d ${remainingHours}h before` : `${days}d before`;
  }
  if (absMinutes >= 60) {
    const hours = Math.floor(absMinutes / 60);
    const remainingMinutes = absMinutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m before` : `${hours}h before`;
  }
  return `${absMinutes}m before`;
}

export function ProductionTaskCard({
  task,
  stationName,
  assignedToName,
  onStatusChange,
}: ProductionTaskCardProps) {
  const status = statusConfig[task.status] ?? statusConfig.pending;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900">{task.name}</h4>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <PrepTypeBadge type={task.prepType} />
        <span className="inline-flex items-center text-xs text-gray-500">
          {task.durationMinutes}min
        </span>
        <span className="inline-flex items-center text-xs text-gray-500">
          {formatOffset(task.offsetMinutes)}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {stationName && <span>Station: {stationName}</span>}
        {assignedToName && <span>Assigned: {assignedToName}</span>}
        {task.servings && <span>Servings: {task.servings}</span>}
      </div>

      {task.notes && <p className="mt-2 text-xs text-gray-500 line-clamp-2">{task.notes}</p>}

      {onStatusChange && task.status !== 'completed' && task.status !== 'skipped' && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          {task.status === 'pending' && (
            <button
              type="button"
              onClick={() => onStatusChange(task.id, 'in_progress')}
              className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
            >
              Start
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              type="button"
              onClick={() => onStatusChange(task.id, 'completed')}
              className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition"
            >
              Complete
            </button>
          )}
          <button
            type="button"
            onClick={() => onStatusChange(task.id, 'skipped')}
            className="text-xs px-3 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
