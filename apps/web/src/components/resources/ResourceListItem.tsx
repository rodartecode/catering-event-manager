export interface ResourceListItemProps {
  id: number;
  name: string;
  type: 'staff' | 'equipment' | 'materials';
  hourlyRate: string | null;
  isSelected: boolean;
  hasConflict: boolean;
  onToggle: () => void;
}

export function ResourceListItem({
  name,
  type,
  hourlyRate,
  isSelected,
  hasConflict,
  onToggle,
}: ResourceListItemProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: custom checkbox button — role="checkbox" is intentional for this selectable list item
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      onClick={onToggle}
      className={`w-full p-3 rounded-lg border text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
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
              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
            }`}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
            <div className="font-medium">{name}</div>
            <div className="text-sm text-gray-500 capitalize">
              {type}
              {hourlyRate && ` • $${hourlyRate}/hr`}
            </div>
          </div>
        </div>
        {hasConflict && isSelected && <span className="text-yellow-600 text-sm">Has conflict</span>}
      </div>
    </button>
  );
}
