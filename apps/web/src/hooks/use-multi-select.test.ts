import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMultiSelect } from './use-multi-select';

const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe('useMultiSelect', () => {
  it('starts with empty selection', () => {
    const { result } = renderHook(() => useMultiSelect(items));
    expect(result.current.count).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
  });

  it('toggles individual items', () => {
    const { result } = renderHook(() => useMultiSelect(items));

    act(() => result.current.toggle(1));
    expect(result.current.count).toBe(1);
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(2)).toBe(false);

    act(() => result.current.toggle(1));
    expect(result.current.count).toBe(0);
    expect(result.current.isSelected(1)).toBe(false);
  });

  it('toggles all items', () => {
    const { result } = renderHook(() => useMultiSelect(items));

    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(3);
    expect(result.current.isAllSelected).toBe(true);

    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
  });

  it('clears selection', () => {
    const { result } = renderHook(() => useMultiSelect(items));

    act(() => result.current.toggle(1));
    act(() => result.current.toggle(2));
    expect(result.current.count).toBe(2);

    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });

  it('handles empty items list', () => {
    const { result } = renderHook(() => useMultiSelect([]));
    expect(result.current.isAllSelected).toBe(false);

    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(0);
  });

  it('returns selectedIds as a Set', () => {
    const { result } = renderHook(() => useMultiSelect(items));

    act(() => result.current.toggle(2));
    expect(result.current.selectedIds).toBeInstanceOf(Set);
    expect(result.current.selectedIds.has(2)).toBe(true);
  });
});
