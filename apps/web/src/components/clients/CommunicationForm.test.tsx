import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationForm } from './CommunicationForm';

const mockMutate = vi.fn();
let mockIsPending = false;
let mockError: { message: string } | null = null;

vi.mock('@/lib/trpc', () => ({
  trpc: {
    clients: {
      recordCommunication: {
        useMutation: vi.fn().mockImplementation(() => ({
          mutate: mockMutate,
          isPending: mockIsPending,
          error: mockError,
        })),
      },
    },
  },
}));

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: createTestWrapper() });
}

const mockEvents = [
  { id: 1, eventName: 'Wedding Reception', eventDate: new Date('2026-06-15') },
  { id: 2, eventName: 'Corporate Lunch', eventDate: new Date('2026-07-20') },
];

describe('CommunicationForm', () => {
  const mockOnSuccess = vi.fn();
  const defaultProps = {
    clientId: 1,
    events: mockEvents,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
    mockError = null;
  });

  describe('collapsed state', () => {
    it('renders the expand button when collapsed', () => {
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      expect(screen.getByText('Record New Communication')).toBeInTheDocument();
    });

    it('does not show the form when collapsed', () => {
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      expect(screen.queryByText('Record Communication')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/event/i)).not.toBeInTheDocument();
    });
  });

  describe('expanded state', () => {
    it('expands the form when clicking the expand button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(screen.getByText('Record Communication')).toBeInTheDocument();
    });

    it('renders all form fields when expanded', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(screen.getByLabelText(/event/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^notes$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/schedule follow-up/i)).toBeInTheDocument();
    });

    it('renders required field indicators for Event and Type', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers).toHaveLength(2);
    });

    it('renders event options from props', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(screen.getByText('Select an event')).toBeInTheDocument();
      expect(screen.getByText(/Wedding Reception/)).toBeInTheDocument();
      expect(screen.getByText(/Corporate Lunch/)).toBeInTheDocument();
    });

    it('renders communication type options', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Meeting')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('defaults type to email', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(screen.getByLabelText(/type/i)).toHaveValue('email');
    });

    it('renders placeholders', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(
        screen.getByPlaceholderText('Brief description of the communication')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Detailed notes about the communication...')
      ).toBeInTheDocument();
    });

    it('renders Save Communication button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(screen.getByRole('button', { name: 'Save Communication' })).toBeInTheDocument();
    });

    it('renders Cancel button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('collapses form when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));
      expect(screen.getByText('Record Communication')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Record Communication')).not.toBeInTheDocument();
      expect(screen.getByText('Record New Communication')).toBeInTheDocument();
    });

    it('allows selecting an event', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      const eventSelect = screen.getByLabelText(/event/i);
      await user.selectOptions(eventSelect, '1');

      expect(eventSelect).toHaveValue('1');
    });

    it('allows selecting a communication type', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      const typeSelect = screen.getByLabelText(/type/i);
      await user.selectOptions(typeSelect, 'phone');

      expect(typeSelect).toHaveValue('phone');
    });

    it('allows typing a subject', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      const input = screen.getByLabelText(/subject/i);
      await user.type(input, 'Menu discussion');

      expect(input).toHaveValue('Menu discussion');
    });

    it('allows typing notes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      const input = screen.getByLabelText(/^notes$/i);
      await user.type(input, 'Discussed menu options');

      expect(input).toHaveValue('Discussed menu options');
    });
  });

  describe('submit behavior', () => {
    it('disables Save button when no event is selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      const submitBtn = screen.getByRole('button', { name: 'Save Communication' });
      expect(submitBtn).toBeDisabled();
    });

    it('enables Save button when an event is selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));
      await user.selectOptions(screen.getByLabelText(/event/i), '1');

      const submitBtn = screen.getByRole('button', { name: 'Save Communication' });
      expect(submitBtn).not.toBeDisabled();
    });

    it('calls mutate with correct data on submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));
      await user.selectOptions(screen.getByLabelText(/event/i), '1');
      await user.selectOptions(screen.getByLabelText(/type/i), 'meeting');
      await user.type(screen.getByLabelText(/subject/i), 'Planning session');
      await user.click(screen.getByRole('button', { name: 'Save Communication' }));

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 1,
          eventId: 1,
          type: 'meeting',
          subject: 'Planning session',
        })
      );
    });

    it('does not call mutate when no event is selected on submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      // Try to submit (button is disabled, but form submit could fire)
      const form = screen.getByRole('button', { name: 'Save Communication' }).closest('form')!;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('pending state', () => {
    it('shows Saving... text when mutation is pending', async () => {
      mockIsPending = true;

      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays mutation error message', async () => {
      mockError = { message: 'Failed to record communication' };

      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} />);

      await user.click(screen.getByText('Record New Communication'));

      expect(screen.getByText('Failed to record communication')).toBeInTheDocument();
    });
  });

  describe('empty events', () => {
    it('renders with no event options when events array is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CommunicationForm {...defaultProps} events={[]} />);

      await user.click(screen.getByText('Record New Communication'));

      const eventSelect = screen.getByLabelText(/event/i);
      // Only the placeholder option should be present
      const options = eventSelect.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('Select an event');
    });
  });
});
