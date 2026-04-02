export interface TimeRangeEditorProps {
  startTime: Date;
  endTime: Date;
  allowEdit: boolean;
  onStartTimeChange: (date: Date) => void;
  onEndTimeChange: (date: Date) => void;
}

function formatDateTimeLocal(date: Date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function TimeRangeEditor({
  startTime,
  endTime,
  allowEdit,
  onStartTimeChange,
  onEndTimeChange,
}: TimeRangeEditorProps) {
  if (!allowEdit) {
    return (
      <p className="text-sm text-gray-500 mt-1">
        {formatDateTime(startTime)} - {formatDateTime(endTime)}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <div className="flex items-center gap-1">
        <label htmlFor="resource-start-time" className="text-sm text-gray-500">
          From:
        </label>
        <input
          id="resource-start-time"
          type="datetime-local"
          value={formatDateTimeLocal(startTime)}
          onChange={(e) => onStartTimeChange(new Date(e.target.value))}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-1">
        <label htmlFor="resource-end-time" className="text-sm text-gray-500">
          To:
        </label>
        <input
          id="resource-end-time"
          type="datetime-local"
          value={formatDateTimeLocal(endTime)}
          onChange={(e) => onEndTimeChange(new Date(e.target.value))}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {endTime <= startTime && (
        <p className="text-sm text-red-600 w-full">End time must be after start time</p>
      )}
    </div>
  );
}
