import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDialogId, useFocusTrap } from './use-focus-trap';

// Test component that uses the focus trap hook
function TestDialog({
  isOpen,
  onClose,
  restoreFocus = true,
  autoFocus = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, { isOpen, onClose, restoreFocus, autoFocus });

  if (!isOpen) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" data-testid="dialog" tabIndex={-1}>
      <h2>Test Dialog</h2>
      <button data-testid="first-button">First Button</button>
      <input data-testid="input" type="text" />
      <button data-testid="last-button">Last Button</button>
    </div>
  );
}

// Test component with no focusable elements
function EmptyDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, { isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} data-testid="empty-dialog">
      <p>No focusable elements here</p>
    </div>
  );
}

// Wrapper component to test focus restoration
function DialogWithTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button data-testid="trigger" onClick={() => setIsOpen(true)}>
        Open Dialog
      </button>
      <TestDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe('focus management', () => {
    it('should focus the first focusable element when dialog opens', () => {
      const onClose = vi.fn();
      render(<TestDialog isOpen={true} onClose={onClose} />);

      // Run timers to allow auto-focus
      vi.runAllTimers();

      expect(screen.getByTestId('first-button')).toHaveFocus();
    });

    it('should not auto-focus when autoFocus is false', () => {
      const onClose = vi.fn();
      render(<TestDialog isOpen={true} onClose={onClose} autoFocus={false} />);

      vi.runAllTimers();

      // First button should not have focus
      expect(screen.getByTestId('first-button')).not.toHaveFocus();
    });

    it('should restore focus to trigger when dialog closes', () => {
      render(<DialogWithTrigger />);

      const trigger = screen.getByTestId('trigger');
      trigger.focus();
      expect(trigger).toHaveFocus();

      // Open dialog
      fireEvent.click(trigger);
      vi.runAllTimers();

      // Dialog should be open
      expect(screen.getByTestId('dialog')).toBeInTheDocument();

      // Close dialog via Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Focus should return to trigger
      expect(trigger).toHaveFocus();
    });

    it('should not restore focus when restoreFocus is false', () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <TestDialog isOpen={true} onClose={onClose} restoreFocus={false} />
      );

      vi.runAllTimers();

      // Store initial focus
      const firstButton = screen.getByTestId('first-button');
      expect(firstButton).toHaveFocus();

      // Close dialog
      rerender(<TestDialog isOpen={false} onClose={onClose} restoreFocus={false} />);

      // Focus should not be restored (first button no longer exists)
      expect(firstButton).not.toHaveFocus();
    });
  });

  describe('Tab key navigation', () => {
    it('should trap Tab within the dialog (forward)', () => {
      const onClose = vi.fn();
      render(<TestDialog isOpen={true} onClose={onClose} />);
      vi.runAllTimers();

      const firstButton = screen.getByTestId('first-button');
      const input = screen.getByTestId('input');
      const lastButton = screen.getByTestId('last-button');

      // Start at first button
      expect(firstButton).toHaveFocus();

      // Tab to input
      fireEvent.keyDown(document, { key: 'Tab' });
      input.focus(); // Simulate browser behavior
      expect(input).toHaveFocus();

      // Tab to last button
      fireEvent.keyDown(document, { key: 'Tab' });
      lastButton.focus();
      expect(lastButton).toHaveFocus();

      // Tab from last button should wrap to first
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(firstButton).toHaveFocus();
    });

    it('should trap Shift+Tab within the dialog (backward)', () => {
      const onClose = vi.fn();
      render(<TestDialog isOpen={true} onClose={onClose} />);
      vi.runAllTimers();

      const firstButton = screen.getByTestId('first-button');
      const lastButton = screen.getByTestId('last-button');

      // Start at first button
      expect(firstButton).toHaveFocus();

      // Shift+Tab from first button should wrap to last
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(lastButton).toHaveFocus();
    });

    it('should handle dialog with no focusable elements', () => {
      const onClose = vi.fn();
      render(<EmptyDialog isOpen={true} onClose={onClose} />);
      vi.runAllTimers();

      // Tab should not cause errors
      fireEvent.keyDown(document, { key: 'Tab' });
      // Should not throw
      expect(screen.getByTestId('empty-dialog')).toBeInTheDocument();
    });
  });

  describe('Escape key', () => {
    it('should call onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      render(<TestDialog isOpen={true} onClose={onClose} />);
      vi.runAllTimers();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should stop propagation of Escape key', () => {
      const onClose = vi.fn();
      const parentHandler = vi.fn();

      render(
        <div onKeyDown={parentHandler}>
          <TestDialog isOpen={true} onClose={onClose} />
        </div>
      );
      vi.runAllTimers();

      fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
      // Parent should not receive the event
      expect(parentHandler).not.toHaveBeenCalled();
    });
  });

  describe('when dialog is closed', () => {
    it('should not trap focus when isOpen is false', () => {
      const onClose = vi.fn();
      render(<TestDialog isOpen={false} onClose={onClose} />);

      // Dialog should not be rendered
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should not call onClose on Escape when dialog is closed', () => {
      const onClose = vi.fn();
      render(<TestDialog isOpen={false} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

describe('useDialogId', () => {
  function TestIdComponent({ prefix }: { prefix: string }) {
    const id = useDialogId(prefix);
    return <div data-testid="id-display">{id}</div>;
  }

  it('should generate an ID with the given prefix', () => {
    render(<TestIdComponent prefix="dialog-title" />);

    const id = screen.getByTestId('id-display').textContent;
    expect(id).toMatch(/^dialog-title-[a-z0-9]+$/);
  });

  it('should generate consistent ID across rerenders', () => {
    const { rerender } = render(<TestIdComponent prefix="dialog-title" />);
    const firstId = screen.getByTestId('id-display').textContent;

    rerender(<TestIdComponent prefix="dialog-title" />);
    const secondId = screen.getByTestId('id-display').textContent;

    expect(firstId).toBe(secondId);
  });

  it('should generate unique IDs for different instances', () => {
    render(
      <>
        <TestIdComponent prefix="title-1" />
        <TestIdComponent prefix="title-2" />
      </>
    );

    const displays = screen.getAllByTestId('id-display');
    const id1 = displays[0].textContent;
    const id2 = displays[1].textContent;

    expect(id1).not.toBe(id2);
  });
});
