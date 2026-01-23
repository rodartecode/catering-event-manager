'use client';

import { useState } from 'react';

interface DateRangePickerProps {
  dateFrom: Date;
  dateTo: Date;
  onChange: (dateFrom: Date, dateTo: Date) => void;
}

type Preset = '7d' | '30d' | '90d' | 'ytd' | 'custom';

export function DateRangePicker({ dateFrom, dateTo, onChange }: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState(formatDateForInput(dateFrom));
  const [customTo, setCustomTo] = useState(formatDateForInput(dateTo));

  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function applyPreset(preset: Preset) {
    setSelectedPreset(preset);
    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    let from: Date;
    switch (preset) {
      case '7d':
        from = new Date(now);
        from.setDate(from.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        break;
      case '30d':
        from = new Date(now);
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        break;
      case '90d':
        from = new Date(now);
        from.setDate(from.getDate() - 90);
        from.setHours(0, 0, 0, 0);
        break;
      case 'ytd':
        from = new Date(now.getFullYear(), 0, 1);
        from.setHours(0, 0, 0, 0);
        break;
      default:
        return; // custom - don't auto-apply
    }

    setCustomFrom(formatDateForInput(from));
    setCustomTo(formatDateForInput(to));
    onChange(from, to);
  }

  function applyCustomRange() {
    setSelectedPreset('custom');
    const from = new Date(customFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(customTo);
    to.setHours(23, 59, 59, 999);
    onChange(from, to);
  }

  const presets: { label: string; value: Preset }[] = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
    { label: 'Year to Date', value: 'ytd' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Preset buttons */}
        <div className="flex gap-2">
          {presets.map((preset) => (
            <button
              type="button"
              key={preset.value}
              onClick={() => applyPreset(preset.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                selectedPreset === preset.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-gray-200" />

        {/* Custom date inputs */}
        <div className="flex items-center gap-2">
          <label htmlFor="date-from" className="text-sm text-gray-600">
            From:
          </label>
          <input
            id="date-from"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <label htmlFor="date-to" className="text-sm text-gray-600">
            To:
          </label>
          <input
            id="date-to"
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={applyCustomRange}
            className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-900 transition"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
