import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRID_CONFIG,
  getGridHeight,
  getTotalSlots,
  pixelToTime,
  snapToGrid,
  timeToPixel,
} from './use-snap-to-grid';

describe('use-snap-to-grid', () => {
  const config = DEFAULT_GRID_CONFIG; // startHour=7, endHour=20, slotMinutes=30, slotHeight=50

  describe('pixelToTime', () => {
    it('converts pixel 0 to start hour', () => {
      const day = new Date('2026-06-15');
      const result = pixelToTime(0, day, config);
      expect(result.getHours()).toBe(7);
      expect(result.getMinutes()).toBe(0);
    });

    it('converts one slot height to 30 min after start', () => {
      const day = new Date('2026-06-15');
      const result = pixelToTime(50, day, config);
      expect(result.getHours()).toBe(7);
      expect(result.getMinutes()).toBe(30);
    });

    it('snaps to nearest slot', () => {
      const day = new Date('2026-06-15');
      // 60px is closer to slot 1 (50px) than slot 2 (100px)
      const result = pixelToTime(60, day, config);
      expect(result.getHours()).toBe(7);
      expect(result.getMinutes()).toBe(30);
    });

    it('clamps negative pixels to start', () => {
      const day = new Date('2026-06-15');
      const result = pixelToTime(-50, day, config);
      expect(result.getHours()).toBe(7);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe('timeToPixel', () => {
    it('converts start hour to pixel 0', () => {
      const time = new Date('2026-06-15T07:00:00');
      expect(timeToPixel(time, config)).toBe(0);
    });

    it('converts 7:30 to one slot height', () => {
      const time = new Date('2026-06-15T07:30:00');
      expect(timeToPixel(time, config)).toBe(50);
    });

    it('converts 9:00 to 4 slots', () => {
      const time = new Date('2026-06-15T09:00:00');
      expect(timeToPixel(time, config)).toBe(200);
    });
  });

  describe('snapToGrid', () => {
    it('snaps exact slot time to itself', () => {
      const time = new Date('2026-06-15T09:00:00');
      const snapped = snapToGrid(time, config);
      expect(snapped.getHours()).toBe(9);
      expect(snapped.getMinutes()).toBe(0);
    });

    it('snaps 9:14 to 9:00', () => {
      const time = new Date('2026-06-15T09:14:00');
      const snapped = snapToGrid(time, config);
      expect(snapped.getHours()).toBe(9);
      expect(snapped.getMinutes()).toBe(0);
    });

    it('snaps 9:16 to 9:30', () => {
      const time = new Date('2026-06-15T09:16:00');
      const snapped = snapToGrid(time, config);
      expect(snapped.getHours()).toBe(9);
      expect(snapped.getMinutes()).toBe(30);
    });

    it('clamps to start hour', () => {
      const time = new Date('2026-06-15T05:00:00');
      const snapped = snapToGrid(time, config);
      expect(snapped.getHours()).toBe(7);
      expect(snapped.getMinutes()).toBe(0);
    });

    it('clamps to end hour', () => {
      const time = new Date('2026-06-15T22:00:00');
      const snapped = snapToGrid(time, config);
      expect(snapped.getHours()).toBe(20);
      expect(snapped.getMinutes()).toBe(0);
    });
  });

  describe('getTotalSlots', () => {
    it('returns correct slot count for default config', () => {
      expect(getTotalSlots(config)).toBe(26); // (20-7)*60/30 = 26
    });
  });

  describe('getGridHeight', () => {
    it('returns correct height for default config', () => {
      expect(getGridHeight(config)).toBe(1300); // 26 * 50
    });
  });
});
