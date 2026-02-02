'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';

/**
 * A list of focusable element selectors.
 * These are the elements that can receive focus via keyboard navigation.
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseFocusTrapOptions {
  /**
   * Whether the focus trap is active.
   * When false, no focus trapping occurs.
   */
  isOpen: boolean;

  /**
   * Callback fired when the Escape key is pressed.
   * Typically used to close the dialog.
   */
  onClose: () => void;

  /**
   * Whether to restore focus to the previously focused element when the trap is deactivated.
   * @default true
   */
  restoreFocus?: boolean;

  /**
   * Whether to focus the first focusable element when the trap is activated.
   * @default true
   */
  autoFocus?: boolean;
}

/**
 * A hook that traps focus within a container element.
 * Implements WAI-ARIA dialog focus management patterns:
 * - Traps Tab/Shift+Tab within the container
 * - Handles Escape key for dismissal
 * - Saves and restores focus on activation/deactivation
 *
 * @param containerRef - A ref to the container element that should trap focus
 * @param options - Configuration options for the focus trap
 *
 * @example
 * ```tsx
 * function Dialog({ isOpen, onClose }) {
 *   const dialogRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(dialogRef, { isOpen, onClose });
 *
 *   return (
 *     <div ref={dialogRef} role="dialog" aria-modal="true">
 *       <button>First focusable</button>
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  containerRef: RefObject<T | null>,
  { isOpen, onClose, restoreFocus = true, autoFocus = true }: UseFocusTrapOptions
): void {
  // Store the element that was focused before the trap was activated
  const previousActiveElement = useRef<HTMLElement | null>(null);

  /**
   * Get all focusable elements within the container.
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
  }, [containerRef]);

  /**
   * Handle keydown events for Tab/Escape navigation.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen || !containerRef.current) return;

      // Handle Escape key
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      // Handle Tab key
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        // Shift+Tab on first element -> go to last
        if (event.shiftKey && activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
          return;
        }

        // Tab on last element -> go to first
        if (!event.shiftKey && activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
          return;
        }

        // If active element is not within the container, focus the first element
        if (!containerRef.current.contains(activeElement as Node)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isOpen, onClose, containerRef, getFocusableElements]
  );

  // Set up event listeners and focus management
  useEffect(() => {
    if (!isOpen) return;

    // Save the currently focused element
    if (restoreFocus && document.activeElement instanceof HTMLElement) {
      previousActiveElement.current = document.activeElement;
    }

    // Auto-focus the first focusable element
    if (autoFocus) {
      // Use a small delay to ensure the container is rendered
      const timeoutId = setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else if (containerRef.current) {
          // If no focusable elements, focus the container itself
          containerRef.current.focus();
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, autoFocus, containerRef, getFocusableElements, restoreFocus]);

  // Add keydown listener
  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, handleKeyDown]);

  // Restore focus when trap is deactivated
  useEffect(() => {
    if (isOpen) return;

    if (restoreFocus && previousActiveElement.current) {
      // Check if the element is still in the DOM and focusable
      if (document.body.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus();
      }
      previousActiveElement.current = null;
    }
  }, [isOpen, restoreFocus]);
}

/**
 * Generate a unique ID for dialog accessibility attributes.
 * Use this to create consistent IDs for aria-labelledby and aria-describedby.
 *
 * @param prefix - A prefix for the ID (e.g., 'dialog-title', 'dialog-description')
 * @returns A unique ID string
 */
export function useDialogId(prefix: string): string {
  const idRef = useRef<string | null>(null);

  if (idRef.current === null) {
    idRef.current = `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
  }

  return idRef.current;
}
