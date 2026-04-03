'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface AvailabilitySlot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

interface AvailabilityGridProps {
  userId: number;
  slots: AvailabilitySlot[];
  isAdmin: boolean;
}

export function AvailabilityGrid({ userId, slots, isAdmin }: AvailabilityGridProps) {
  const [editing, setEditing] = useState(false);
  const [editSlots, setEditSlots] = useState<
    Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  >([]);

  const utils = trpc.useUtils();
  const setAvailability = trpc.staff.setAvailability.useMutation({
    onSuccess: () => {
      utils.staff.getStaffProfile.invalidate();
      utils.staff.getAvailability.invalidate();
      setEditing(false);
    },
  });

  const slotsByDay = new Map<number, AvailabilitySlot[]>();
  for (const slot of slots) {
    const existing = slotsByDay.get(slot.dayOfWeek) || [];
    existing.push(slot);
    slotsByDay.set(slot.dayOfWeek, existing);
  }

  const startEditing = () => {
    setEditSlots(
      slots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );
    setEditing(true);
  };

  const addSlot = (dayOfWeek: number) => {
    setEditSlots([...editSlots, { dayOfWeek, startTime: '09:00', endTime: '17:00' }]);
  };

  const removeSlot = (index: number) => {
    setEditSlots(editSlots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setEditSlots(editSlots.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleSave = () => {
    setAvailability.mutate({ userId, slots: editSlots });
  };

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Weekly Availability</h3>
          {isAdmin && (
            <button
              type="button"
              onClick={startEditing}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>
        {slots.length === 0 ? (
          <p className="text-sm text-gray-500">No availability set</p>
        ) : (
          <div className="space-y-2">
            {DAYS.map((day, i) => {
              const daySlots = slotsByDay.get(i);
              if (!daySlots) return null;
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-medium text-gray-700">{DAY_ABBR[i]}</span>
                  <div className="flex gap-2">
                    {daySlots.map((slot) => (
                      <span
                        key={slot.id}
                        className="inline-flex items-center px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-sm"
                      >
                        {slot.startTime} - {slot.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Edit Availability</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={setAvailability.isPending}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {setAvailability.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {DAYS.map((day, dayIndex) => {
          const dayEditSlots = editSlots
            .map((s, i) => ({ ...s, index: i }))
            .filter((s) => s.dayOfWeek === dayIndex);

          return (
            <div key={day} className="flex items-start gap-3">
              <span className="w-12 text-sm font-medium text-gray-700 pt-2">
                {DAY_ABBR[dayIndex]}
              </span>
              <div className="flex-1 space-y-1">
                {dayEditSlots.map((slot) => (
                  <div key={slot.index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(slot.index, 'startTime', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(slot.index, 'endTime', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      aria-label={`Remove ${day} slot`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSlot(dayIndex)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add slot
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
