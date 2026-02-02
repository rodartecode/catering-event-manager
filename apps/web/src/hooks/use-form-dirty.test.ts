import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFormDirty } from './use-form-dirty';

describe('useFormDirty', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isDirty detection', () => {
    it('returns isDirty=false when values match initial', () => {
      const { result } = renderHook(() =>
        useFormDirty({
          initialValues: { name: 'Test', count: 5 },
          currentValues: { name: 'Test', count: 5 },
        })
      );

      expect(result.current.isDirty).toBe(false);
    });

    it('returns isDirty=true when values differ from initial', () => {
      const { result } = renderHook(() =>
        useFormDirty({
          initialValues: { name: 'Test', count: 5 },
          currentValues: { name: 'Changed', count: 5 },
        })
      );

      expect(result.current.isDirty).toBe(true);
    });

    it('detects changes in nested objects', () => {
      const { result } = renderHook(() =>
        useFormDirty({
          initialValues: { user: { name: 'Test' } },
          currentValues: { user: { name: 'Changed' } },
        })
      );

      expect(result.current.isDirty).toBe(true);
    });

    it('handles null and undefined values', () => {
      const { result } = renderHook(() =>
        useFormDirty({
          initialValues: { name: null },
          currentValues: { name: undefined },
        })
      );

      // null !== undefined
      expect(result.current.isDirty).toBe(true);
    });

    it('handles arrays correctly', () => {
      const { result: same } = renderHook(() =>
        useFormDirty({
          initialValues: { items: [1, 2, 3] },
          currentValues: { items: [1, 2, 3] },
        })
      );
      expect(same.current.isDirty).toBe(false);

      const { result: different } = renderHook(() =>
        useFormDirty({
          initialValues: { items: [1, 2, 3] },
          currentValues: { items: [1, 2, 4] },
        })
      );
      expect(different.current.isDirty).toBe(true);
    });
  });

  describe('enabled option', () => {
    it('returns isDirty=false when disabled even if values differ', () => {
      const { result } = renderHook(() =>
        useFormDirty({
          initialValues: { name: 'Test' },
          currentValues: { name: 'Changed' },
          enabled: false,
        })
      );

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('beforeunload handler', () => {
    it('adds beforeunload listener when dirty', () => {
      renderHook(() =>
        useFormDirty({
          initialValues: { name: 'Test' },
          currentValues: { name: 'Changed' },
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('does not add beforeunload listener when clean', () => {
      renderHook(() =>
        useFormDirty({
          initialValues: { name: 'Test' },
          currentValues: { name: 'Test' },
        })
      );

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('removes beforeunload listener on cleanup', () => {
      const { unmount } = renderHook(() =>
        useFormDirty({
          initialValues: { name: 'Test' },
          currentValues: { name: 'Changed' },
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('removes beforeunload listener when form becomes clean', () => {
      const { rerender } = renderHook(
        ({ currentValues }) =>
          useFormDirty({
            initialValues: { name: 'Test' },
            currentValues,
          }),
        {
          initialProps: { currentValues: { name: 'Changed' } },
        }
      );

      // Form is dirty, listener added
      expect(addEventListenerSpy).toHaveBeenCalled();

      // Make form clean
      rerender({ currentValues: { name: 'Test' } });

      // Listener should be removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
  });

  describe('markClean', () => {
    it('clears dirty state when called', () => {
      const { result, rerender } = renderHook(
        ({ currentValues }) =>
          useFormDirty({
            initialValues: { name: 'Test' },
            currentValues,
          }),
        {
          initialProps: { currentValues: { name: 'Changed' } },
        }
      );

      expect(result.current.isDirty).toBe(true);

      // Simulate a save - mark the current values as "saved"
      act(() => {
        result.current.markClean();
      });

      // Re-render with same current values to trigger recalculation
      rerender({ currentValues: { name: 'Changed' } });

      // Now the form should be clean since "Changed" is the new baseline
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('initialValues updates', () => {
    it('updates saved reference when initialValues change', () => {
      const { result, rerender } = renderHook(
        ({ initialValues, currentValues }) =>
          useFormDirty({
            initialValues,
            currentValues,
          }),
        {
          initialProps: {
            initialValues: { name: 'Original' },
            currentValues: { name: 'Changed' },
          },
        }
      );

      expect(result.current.isDirty).toBe(true);

      // Simulate data refetch - initialValues updated to match current
      rerender({
        initialValues: { name: 'Changed' },
        currentValues: { name: 'Changed' },
      });

      expect(result.current.isDirty).toBe(false);
    });
  });
});
