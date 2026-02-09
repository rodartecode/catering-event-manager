import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Mock trpc
const mockMutate = vi.fn();
const mockInvalidate = vi.fn();
let mutationCallbacks: { onSuccess?: (data: unknown) => void; onError?: (err: unknown) => void } =
  {};

vi.mock('@/lib/trpc', () => ({
  trpc: {
    event: {
      clone: {
        useMutation: (opts: typeof mutationCallbacks) => {
          mutationCallbacks = opts;
          return {
            mutate: mockMutate,
            isPending: false,
            error: null,
          };
        },
      },
    },
    useUtils: () => ({
      event: {
        list: { invalidate: mockInvalidate },
      },
    }),
  },
}));

// Mock focus trap hook
vi.mock('@/hooks/use-focus-trap', () => ({
  useDialogId: (prefix: string) => `${prefix}-1`,
  useFocusTrap: vi.fn(),
}));

import { CloneEventDialog } from './CloneEventDialog';

const sourceEvent = {
  id: 1,
  eventName: 'Annual Gala',
  location: 'Grand Ballroom',
  estimatedAttendees: 200,
  notes: 'Original notes here',
  client: {
    id: 1,
    companyName: 'Acme Corp',
  },
};

describe('CloneEventDialog', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mutationCallbacks = {};
  });

  afterEach(() => {
    cleanup();
  });

  it('renders pre-filled fields from source event', () => {
    render(<CloneEventDialog sourceEvent={sourceEvent} onClose={onClose} />);

    expect(screen.getByLabelText(/event name/i)).toHaveValue('Annual Gala');
    expect(screen.getByLabelText(/location/i)).toHaveValue('Grand Ballroom');
    expect(screen.getByLabelText(/estimated attendees/i)).toHaveValue(200);
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Original notes here');
    // Date should be empty (required input)
    expect(screen.getByLabelText(/new event date/i)).toHaveValue('');
  });

  it('requires event date (native validation prevents submission)', async () => {
    const user = userEvent.setup();
    render(<CloneEventDialog sourceEvent={sourceEvent} onClose={onClose} />);

    const dateInput = screen.getByLabelText(/new event date/i);
    expect(dateInput).toBeRequired();

    // Clicking submit without a date should not call mutate (native validation blocks it)
    await user.click(screen.getByRole('button', { name: /clone event/i }));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('allows submission after entering a date', async () => {
    const user = userEvent.setup();
    render(<CloneEventDialog sourceEvent={sourceEvent} onClose={onClose} />);

    // Enter a date and submit
    await user.type(screen.getByLabelText(/new event date/i), '2026-09-20');
    await user.click(screen.getByRole('button', { name: /clone event/i }));

    expect(mockMutate).toHaveBeenCalled();
  });

  it('calls mutation with correct data on submit', async () => {
    const user = userEvent.setup();
    render(<CloneEventDialog sourceEvent={sourceEvent} onClose={onClose} />);

    await user.type(screen.getByLabelText(/new event date/i), '2026-09-20');
    await user.click(screen.getByRole('button', { name: /clone event/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceEventId: 1,
        eventDate: expect.any(Date),
      })
    );
  });

  it('navigates to new event on successful clone', async () => {
    render(<CloneEventDialog sourceEvent={sourceEvent} onClose={onClose} />);

    // Simulate successful mutation
    await waitFor(() => {
      expect(mutationCallbacks.onSuccess).toBeDefined();
    });
    mutationCallbacks.onSuccess!({ id: 42 });

    expect(mockPush).toHaveBeenCalledWith('/events/42');
    expect(onClose).toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<CloneEventDialog sourceEvent={sourceEvent} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes dialog when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<CloneEventDialog sourceEvent={sourceEvent} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
