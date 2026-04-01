import { addMinutes, differenceInMinutes, startOfDay } from 'date-fns';

const SLOT_MINUTES = 30;

export interface GridConfig {
  startHour: number; // e.g., 7 for 7 AM
  endHour: number; // e.g., 20 for 8 PM
  slotMinutes: number; // e.g., 30
  slotHeight: number; // pixels per slot
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  startHour: 7,
  endHour: 20,
  slotMinutes: SLOT_MINUTES,
  slotHeight: 50,
};

/**
 * Convert a pixel Y offset within a day column to a snapped Date.
 */
export function pixelToTime(pixelY: number, dayDate: Date, config = DEFAULT_GRID_CONFIG): Date {
  const slotIndex = Math.max(0, Math.round(pixelY / config.slotHeight));
  const minutesFromStart = slotIndex * config.slotMinutes;
  const dayStart = startOfDay(dayDate);
  return addMinutes(dayStart, config.startHour * 60 + minutesFromStart);
}

/**
 * Convert a Date to a pixel Y offset within a day column.
 */
export function timeToPixel(time: Date, config = DEFAULT_GRID_CONFIG): number {
  const dayStart = startOfDay(time);
  const minutesSinceStart = differenceInMinutes(time, dayStart) - config.startHour * 60;
  const slotIndex = minutesSinceStart / config.slotMinutes;
  return slotIndex * config.slotHeight;
}

/**
 * Snap a Date to the nearest grid slot boundary.
 */
export function snapToGrid(time: Date, config = DEFAULT_GRID_CONFIG): Date {
  const dayStart = startOfDay(time);
  const minutesSinceMidnight = differenceInMinutes(time, dayStart);
  const snappedMinutes = Math.round(minutesSinceMidnight / config.slotMinutes) * config.slotMinutes;

  // Clamp to grid bounds
  const minMinutes = config.startHour * 60;
  const maxMinutes = config.endHour * 60;
  const clamped = Math.max(minMinutes, Math.min(maxMinutes, snappedMinutes));

  return addMinutes(dayStart, clamped);
}

/**
 * Calculate the total number of slots in the grid.
 */
export function getTotalSlots(config = DEFAULT_GRID_CONFIG): number {
  return ((config.endHour - config.startHour) * 60) / config.slotMinutes;
}

/**
 * Calculate grid height in pixels.
 */
export function getGridHeight(config = DEFAULT_GRID_CONFIG): number {
  return getTotalSlots(config) * config.slotHeight;
}
