'use client';

import { useMemo, useState } from 'react';

interface Resource {
  id: number;
  name: string;
  type: 'staff' | 'equipment' | 'materials';
  hourlyRate: string | null;
  isAvailable: boolean;
}

interface ResourceFilterSidebarProps {
  resources: Resource[];
  selectedIds: Set<number>;
  onToggleResource: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const typeConfig = {
  staff: { label: 'Staff', color: 'bg-purple-100 text-purple-800' },
  equipment: { label: 'Equipment', color: 'bg-blue-100 text-blue-800' },
  materials: { label: 'Materials', color: 'bg-green-100 text-green-800' },
};

export function ResourceFilterSidebar({
  resources,
  selectedIds,
  onToggleResource,
  onSelectAll,
  onDeselectAll,
}: ResourceFilterSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(
    new Set(['staff', 'equipment', 'materials'])
  );
  const [showUnavailable, setShowUnavailable] = useState(false);

  const toggleType = (type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (!typeFilters.has(r.type)) return false;
      if (!showUnavailable && !r.isAvailable) return false;
      if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [resources, typeFilters, showUnavailable, searchQuery]);

  return (
    <div className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Resources</h3>

        {/* Search */}
        <input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search resources"
        />
      </div>

      {/* Type filters */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(typeConfig) as [string, { label: string; color: string }][]).map(
            ([type, { label, color }]) => (
              <button
                type="button"
                key={type}
                onClick={() => toggleType(type)}
                className={`px-2 py-0.5 text-xs rounded-full border transition ${
                  typeFilters.has(type)
                    ? `${color} border-transparent`
                    : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
                aria-pressed={typeFilters.has(type)}
                aria-label={`Filter ${label}`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Availability toggle */}
        <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showUnavailable}
            onChange={(e) => setShowUnavailable(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show unavailable
        </label>
      </div>

      {/* Quick actions */}
      <div className="px-3 py-2 border-b border-gray-200 flex gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Select all
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={onDeselectAll}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Deselect all
        </button>
      </div>

      {/* Resource list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredResources.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No resources match filters</p>
        ) : (
          <ul className="space-y-1">
            {filteredResources.map((r) => (
              <li key={r.id}>
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => onToggleResource(r.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="flex-1 text-sm text-gray-700 truncate">{r.name}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${typeConfig[r.type].color}`}
                  >
                    {r.type[0].toUpperCase()}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selection count */}
      <div className="p-2 border-t border-gray-200 text-xs text-gray-500 text-center">
        {selectedIds.size} of {resources.length} selected
      </div>
    </div>
  );
}
