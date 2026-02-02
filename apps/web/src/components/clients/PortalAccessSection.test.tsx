import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '../../../test/helpers/render';
import { PortalAccessSection } from './PortalAccessSection';

// Track mutation callbacks
let enableMutationOptions: {
  onSuccess?: () => void;
  onError?: (err: { message: string }) => void;
} = {};
let disableMutationOptions: {
  onSuccess?: () => void;
  onError?: (err: { message: string }) => void;
} = {};

// Mock state
let mockPortalUser: {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
} | null = null;
let mockPortalUserLoading = false;
let mockEnablePending = false;
let mockDisablePending = false;
const mockEnableMutate = vi.fn();
const mockDisableMutate = vi.fn();

// Mock tRPC
vi.mock('@/lib/trpc', () => ({
  trpc: {
    clients: {
      getPortalUser: {
        useQuery: (_input: { clientId: number }, options: { enabled?: boolean }) => ({
          data: options.enabled ? mockPortalUser : undefined,
          isLoading: options.enabled ? mockPortalUserLoading : false,
          error: null,
        }),
      },
      enablePortalAccess: {
        useMutation: (options: {
          onSuccess?: () => void;
          onError?: (err: { message: string }) => void;
        }) => {
          enableMutationOptions = options;
          return {
            mutate: mockEnableMutate,
            isPending: mockEnablePending,
            error: null,
          };
        },
      },
      disablePortalAccess: {
        useMutation: (options: {
          onSuccess?: () => void;
          onError?: (err: { message: string }) => void;
        }) => {
          disableMutationOptions = options;
          return {
            mutate: mockDisableMutate,
            isPending: mockDisablePending,
            error: null,
          };
        },
      },
    },
    useUtils: () => ({
      clients: {
        getById: { invalidate: vi.fn() },
        getPortalUser: { invalidate: vi.fn() },
      },
    }),
    createClient: vi.fn(),
    Provider: ({ children }: { children: ReactNode }) => children,
  },
}));

describe('PortalAccessSection', () => {
  const defaultProps = {
    clientId: 1,
    clientEmail: 'client@company.com',
    portalEnabled: false,
    portalEnabledAt: null,
    onUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPortalUser = null;
    mockPortalUserLoading = false;
    mockEnablePending = false;
    mockDisablePending = false;
    enableMutationOptions = {};
    disableMutationOptions = {};
  });

  describe('disabled state (portal not enabled)', () => {
    it('renders enable form with email input', () => {
      render(<PortalAccessSection {...defaultProps} />);

      expect(screen.getByText('Portal Access')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enable portal access/i })).toBeInTheDocument();
    });

    it('pre-fills email with client email', () => {
      render(<PortalAccessSection {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveValue('client@company.com');
    });

    it('has send welcome email checkbox checked by default', () => {
      render(<PortalAccessSection {...defaultProps} />);

      const checkbox = screen.getByLabelText(/send welcome email/i);
      expect(checkbox).toBeChecked();
    });

    it('shows description about portal access', () => {
      render(<PortalAccessSection {...defaultProps} />);

      expect(screen.getByText(/enable portal access to allow this client/i)).toBeInTheDocument();
    });
  });

  describe('enable form validation', () => {
    it('does not call mutation for invalid email without @', async () => {
      const user = userEvent.setup();
      render(<PortalAccessSection {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      // Submit the form directly to bypass HTML5 validation
      const form = screen.getByRole('button', { name: /enable portal access/i }).closest('form');
      expect(form).not.toBeNull();
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
      expect(mockEnableMutate).not.toHaveBeenCalled();
    });

    it('does not call mutation for empty email', async () => {
      const user = userEvent.setup();
      render(<PortalAccessSection {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);

      // Submit the form directly to bypass HTML5 validation
      const form = screen.getByRole('button', { name: /enable portal access/i }).closest('form');
      expect(form).not.toBeNull();
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
      expect(mockEnableMutate).not.toHaveBeenCalled();
    });
  });

  describe('enable mutation', () => {
    it('calls mutation with correct parameters', async () => {
      const user = userEvent.setup();
      render(<PortalAccessSection {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /enable portal access/i }));

      expect(mockEnableMutate).toHaveBeenCalledWith({
        clientId: 1,
        contactEmail: 'client@company.com',
        sendWelcome: true,
      });
    });

    it('calls mutation with sendWelcome false when unchecked', async () => {
      const user = userEvent.setup();
      render(<PortalAccessSection {...defaultProps} />);

      await user.click(screen.getByLabelText(/send welcome email/i));
      await user.click(screen.getByRole('button', { name: /enable portal access/i }));

      expect(mockEnableMutate).toHaveBeenCalledWith({
        clientId: 1,
        contactEmail: 'client@company.com',
        sendWelcome: false,
      });
    });

    it('calls mutation with custom email', async () => {
      const user = userEvent.setup();
      render(<PortalAccessSection {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'different@email.com');

      await user.click(screen.getByRole('button', { name: /enable portal access/i }));

      expect(mockEnableMutate).toHaveBeenCalledWith({
        clientId: 1,
        contactEmail: 'different@email.com',
        sendWelcome: true,
      });
    });

    it('shows enabling state while pending', () => {
      mockEnablePending = true;
      render(<PortalAccessSection {...defaultProps} />);

      expect(screen.getByRole('button', { name: /enabling/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enabling/i })).toBeDisabled();
    });
  });

  describe('enabled state (portal enabled)', () => {
    const enabledProps = {
      ...defaultProps,
      portalEnabled: true,
      portalEnabledAt: new Date('2024-01-15'),
    };

    beforeEach(() => {
      mockPortalUser = {
        id: 3,
        email: 'client@company.com',
        name: 'Client User',
        isActive: true,
      };
    });

    it('renders status banner showing enabled', () => {
      render(<PortalAccessSection {...enabledProps} />);

      expect(screen.getByText('Portal Access Enabled')).toBeInTheDocument();
      expect(screen.getByText(/this client can access the portal/i)).toBeInTheDocument();
    });

    it('shows enabled date', () => {
      render(<PortalAccessSection {...enabledProps} />);

      expect(screen.getByText(/enabled on/i)).toBeInTheDocument();
      // Check that date is rendered (locale-independent check)
      const dateText = screen.getByText(/enabled on/i).textContent;
      expect(dateText).toContain('2024');
    });

    it('shows portal user information', () => {
      render(<PortalAccessSection {...enabledProps} />);

      expect(screen.getByText('Portal Account')).toBeInTheDocument();
      expect(screen.getByText('client@company.com')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows inactive status for inactive user', () => {
      mockPortalUser = {
        id: 3,
        email: 'client@company.com',
        name: 'Client User',
        isActive: false,
      };

      render(<PortalAccessSection {...enabledProps} />);

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('shows loading state for portal user', () => {
      mockPortalUserLoading = true;

      render(<PortalAccessSection {...enabledProps} />);

      // Should show loading placeholder
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });

    it('shows disable button', () => {
      render(<PortalAccessSection {...enabledProps} />);

      expect(screen.getByRole('button', { name: /disable portal access/i })).toBeInTheDocument();
    });

    it('does not show enable form', () => {
      render(<PortalAccessSection {...enabledProps} />);

      expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    });
  });

  describe('disable confirmation flow', () => {
    const enabledProps = {
      ...defaultProps,
      portalEnabled: true,
      portalEnabledAt: new Date('2024-01-15'),
    };

    beforeEach(() => {
      mockPortalUser = {
        id: 3,
        email: 'client@company.com',
        name: 'Client User',
        isActive: true,
      };
    });

    it('shows confirmation when disable button clicked', async () => {
      const user = userEvent.setup();
      render(<PortalAccessSection {...enabledProps} />);

      await user.click(screen.getByRole('button', { name: /disable portal access/i }));

      expect(screen.getByText(/are you sure you want to disable/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /yes, disable access/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('hides confirmation when cancel clicked', async () => {
      const user = userEvent.setup();
      render(<PortalAccessSection {...enabledProps} />);

      await user.click(screen.getByRole('button', { name: /disable portal access/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText(/are you sure you want to disable/i)).not.toBeInTheDocument();
    });

    it('calls disable mutation when confirmed', async () => {
      const user = userEvent.setup();
      render(<PortalAccessSection {...enabledProps} />);

      await user.click(screen.getByRole('button', { name: /disable portal access/i }));
      await user.click(screen.getByRole('button', { name: /yes, disable access/i }));

      expect(mockDisableMutate).toHaveBeenCalledWith({ clientId: 1 });
    });

    it('shows disabling state while pending', async () => {
      const user = userEvent.setup();
      mockDisablePending = true;

      render(<PortalAccessSection {...enabledProps} />);

      await user.click(screen.getByRole('button', { name: /disable portal access/i }));

      expect(screen.getByRole('button', { name: /disabling/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disabling/i })).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('displays error message from enable mutation', async () => {
      render(<PortalAccessSection {...defaultProps} />);

      // Simulate error callback wrapped in act
      await act(async () => {
        enableMutationOptions.onError?.({ message: 'Client already has portal access' });
      });

      expect(screen.getByText('Client already has portal access')).toBeInTheDocument();
    });

    it('displays error message from disable mutation', async () => {
      mockPortalUser = {
        id: 3,
        email: 'client@company.com',
        name: 'Client User',
        isActive: true,
      };

      render(
        <PortalAccessSection {...defaultProps} portalEnabled={true} portalEnabledAt={new Date()} />
      );

      // Simulate error callback wrapped in act
      await act(async () => {
        disableMutationOptions.onError?.({ message: 'Failed to disable portal' });
      });

      expect(screen.getByText('Failed to disable portal')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onUpdate after successful enable', () => {
      const onUpdate = vi.fn();
      render(<PortalAccessSection {...defaultProps} onUpdate={onUpdate} />);

      // Simulate success callback
      enableMutationOptions.onSuccess?.();

      expect(onUpdate).toHaveBeenCalled();
    });

    it('calls onUpdate after successful disable', () => {
      const onUpdate = vi.fn();
      mockPortalUser = {
        id: 3,
        email: 'client@company.com',
        name: 'Client User',
        isActive: true,
      };

      render(<PortalAccessSection {...defaultProps} portalEnabled={true} onUpdate={onUpdate} />);

      // Simulate success callback
      disableMutationOptions.onSuccess?.();

      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has proper form labels', () => {
      render(<PortalAccessSection {...defaultProps} />);

      // Email input should have label
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('id', 'portal-email');

      // Checkbox should have label
      const checkbox = screen.getByLabelText(/send welcome email/i);
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('has required attribute on email input', () => {
      render(<PortalAccessSection {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('required');
    });

    it('has aria-hidden on decorative icons', () => {
      mockPortalUser = {
        id: 3,
        email: 'client@company.com',
        name: 'Client User',
        isActive: true,
      };

      render(
        <PortalAccessSection {...defaultProps} portalEnabled={true} portalEnabledAt={new Date()} />
      );

      // The checkmark icon should be hidden from screen readers
      const checkIcon = document.querySelector('svg[aria-hidden="true"]');
      expect(checkIcon).toBeInTheDocument();
    });
  });
});
