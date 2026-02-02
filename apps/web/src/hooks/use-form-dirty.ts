'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Deep equality check for form values.
 * Handles objects, arrays, and primitive values.
 */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!isEqual(aObj[key], bObj[key])) return false;
    }

    return true;
  }

  return false;
}

interface UseFormDirtyOptions<T> {
  /**
   * The initial/saved values to compare against.
   */
  initialValues: T;

  /**
   * The current form values.
   */
  currentValues: T;

  /**
   * Whether the form dirty tracking is enabled.
   * Set to false to disable the beforeunload warning.
   * @default true
   */
  enabled?: boolean;
}

interface UseFormDirtyReturn {
  /**
   * Whether the form has unsaved changes.
   */
  isDirty: boolean;

  /**
   * Mark the form as clean (e.g., after successful save).
   * This updates the internal reference to consider current values as "saved".
   */
  markClean: () => void;
}

/**
 * A hook that tracks whether a form has unsaved changes and warns before navigation.
 *
 * Features:
 * - Compares current values against initial values to detect changes
 * - Attaches beforeunload listener when form is dirty
 * - Provides markClean() to reset after successful save
 *
 * @example
 * ```tsx
 * function MyForm({ initialData, onSave }) {
 *   const [formData, setFormData] = useState(initialData);
 *   const { isDirty, markClean } = useFormDirty({
 *     initialValues: initialData,
 *     currentValues: formData,
 *   });
 *
 *   const handleSave = async () => {
 *     await onSave(formData);
 *     markClean(); // Clear dirty state after save
 *   };
 *
 *   return (
 *     <form>
 *       {isDirty && <span>You have unsaved changes</span>}
 *       <button onClick={handleSave}>Save</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useFormDirty<T>({
  initialValues,
  currentValues,
  enabled = true,
}: UseFormDirtyOptions<T>): UseFormDirtyReturn {
  // Store the "saved" values - this is what we compare against
  // Initialize with initialValues and update synchronously when they change
  const savedValuesRef = useRef<T>(initialValues);
  const prevInitialValuesRef = useRef<T>(initialValues);

  // Synchronously update saved values when initialValues change
  // This ensures isDirty is calculated correctly on the same render
  if (!isEqual(prevInitialValuesRef.current, initialValues)) {
    savedValuesRef.current = initialValues;
    prevInitialValuesRef.current = initialValues;
  }

  // Calculate if form is dirty
  const isDirty = enabled && !isEqual(savedValuesRef.current, currentValues);

  // Handle beforeunload when dirty
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Modern browsers ignore custom messages, but we still need to set returnValue
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Mark the form as clean (call after successful save)
  const markClean = useCallback(() => {
    savedValuesRef.current = currentValues;
  }, [currentValues]);

  return { isDirty, markClean };
}
