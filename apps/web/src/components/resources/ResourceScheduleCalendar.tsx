'use client';

import { useState } from 'react';

interface ScheduleEntry {
  id: number;
  resourceId: number;
  eventId: number;
  eventName: string;
  taskId?: number;
  taskTitle?: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

interface ResourceScheduleCalendarProps {
  entries: ScheduleEntry[];
  onEntryClick?: (entry: ScheduleEntry) => void;
}

export function ResourceScheduleCalendar({ entries, onEntryClick }: ResourceScheduleCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());

  // Get start and end of the week
  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Sunday

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays(viewDate);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

  const navigateWeek = (direction: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setViewDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getEntriesForDayAndHour = (day: Date, hour: number) => {
    return entries.filter((entry) => {
      const entryStart = new Date(entry.startTime);
      const entryEnd = new Date(entry.endTime);
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(day);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // Check if entry overlaps with this hour slot
      return (
        entryStart.toDateString() === day.toDateString() &&
        entryStart.getHours() <= hour &&
        entryEnd.getHours() > hour
      );
    });
  };

  const isStartOfEntry = (entry: ScheduleEntry, day: Date, hour: number) => {
    const entryStart = new Date(entry.startTime);
    return (
      entryStart.toDateString() === day.toDateString() &&
      entryStart.getHours() === hour
    );
  };

  const getEntryDuration = (entry: ScheduleEntry) => {
    const start = new Date(entry.startTime);
    const end = new Date(entry.endTime);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold">
          {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewDate(new Date())}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            Today
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-2 text-center text-sm text-gray-500 border-r"></div>
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={`p-2 text-center border-r last:border-r-0 ${
                  isToday(day) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="text-sm font-medium text-gray-900">{formatDayName(day)}</div>
                <div
                  className={`text-sm ${
                    isToday(day) ? 'text-blue-600 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {formatDate(day)}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="max-h-[600px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                {/* Time Label */}
                <div className="p-2 text-right text-sm text-gray-500 border-r">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>

                {/* Day Cells */}
                {weekDays.map((day, dayIndex) => {
                  const dayEntries = getEntriesForDayAndHour(day, hour);

                  return (
                    <div
                      key={dayIndex}
                      className={`p-1 min-h-[50px] border-r last:border-r-0 relative ${
                        isToday(day) ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {dayEntries.map((entry) => {
                        if (!isStartOfEntry(entry, day, hour)) return null;
                        const duration = getEntryDuration(entry);

                        return (
                          <button
                            key={entry.id}
                            onClick={() => onEntryClick?.(entry)}
                            className="absolute inset-x-1 bg-blue-500 text-white text-xs rounded p-1 overflow-hidden hover:bg-blue-600 transition text-left z-10"
                            style={{
                              height: `calc(${duration * 100}% - 2px)`,
                              minHeight: '44px',
                            }}
                          >
                            <div className="font-medium truncate">{entry.eventName}</div>
                            {entry.taskTitle && (
                              <div className="truncate text-blue-100">{entry.taskTitle}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      {entries.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p>No scheduled assignments for this period</p>
        </div>
      )}
    </div>
  );
}
