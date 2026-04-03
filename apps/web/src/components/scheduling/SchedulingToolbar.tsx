import type { ViewMode } from './SchedulingCalendar';

interface SchedulingToolbarProps {
  headerLabel: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onGoToToday: () => void;
}

export function SchedulingToolbar({
  headerLabel,
  viewMode,
  onViewModeChange,
  onNavigatePrev,
  onNavigateNext,
  onGoToToday,
}: SchedulingToolbarProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNavigatePrev}
          className="p-1.5 hover:bg-gray-100 rounded transition"
          aria-label="Previous"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onGoToToday}
          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onNavigateNext}
          className="p-1.5 hover:bg-gray-100 rounded transition"
          aria-label="Next"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-gray-800 ml-2">{headerLabel}</h3>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange('day')}
          className={`px-3 py-1 text-xs rounded-md transition ${
            viewMode === 'day'
              ? 'bg-white shadow text-gray-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Day
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('week')}
          className={`px-3 py-1 text-xs rounded-md transition ${
            viewMode === 'week'
              ? 'bg-white shadow text-gray-800'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Week
        </button>
      </div>
    </div>
  );
}
