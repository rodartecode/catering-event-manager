interface Conflict {
  resourceId: number;
  resourceName: string;
  conflictingEventId: number;
  conflictingEventName: string;
  conflictingTaskId?: number;
  conflictingTaskTitle?: string;
  existingStartTime: Date;
  existingEndTime: Date;
  requestedStartTime: Date;
  requestedEndTime: Date;
  message: string;
}

interface ConflictWarningProps {
  conflicts: Conflict[];
  onDismiss?: () => void;
}

export function ConflictWarning({ conflicts, onDismiss }: ConflictWarningProps) {
  if (conflicts.length === 0) return null;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Scheduling Conflict{conflicts.length > 1 ? 's' : ''} Detected
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="list-disc list-inside space-y-2">
              {conflicts.map((conflict, index) => (
                <li key={index}>
                  <span className="font-medium">{conflict.resourceName}</span> is already scheduled
                  for <span className="font-medium">{conflict.conflictingEventName}</span>
                  {conflict.conflictingTaskTitle && (
                    <> ({conflict.conflictingTaskTitle})</>
                  )}
                  <div className="ml-4 mt-1 text-xs text-yellow-600">
                    Existing: {formatTime(conflict.existingStartTime)} -{' '}
                    {formatTime(conflict.existingEndTime)}
                    <br />
                    Requested: {formatTime(conflict.requestedStartTime)} -{' '}
                    {formatTime(conflict.requestedEndTime)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {onDismiss && (
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={onDismiss}
              className="p-2 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100 rounded-lg transition"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
