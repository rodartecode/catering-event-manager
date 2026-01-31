import { render, screen, fireEvent, waitFor } from '../../../test/helpers/render';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from './RegisterForm';
import { signIn } from 'next-auth/react';
import { vi } from 'vitest';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock tRPC
const mockMutate = vi.fn();
vi.mock('@/lib/trpc', () => ({
  trpc: {
    user: {
      register: {
        useMutation: (options: { onSuccess?: (data: unknown) => void; onError?: (error: Error) => void }) => ({
          mutate: mockMutate.mockImplementation((data) => {
            // Call onSuccess by default
            options.onSuccess?.({ id: '1', email: data.email, name: data.name });
          }),
          isPending: false,
        }),
      },
    },
    createClient: vi.fn(),
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

describe('RegisterForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the registration form with all fields', () => {
    render(<RegisterForm />);

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    render(<RegisterForm />);

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('renders role dropdown with options', () => {
    render(<RegisterForm />);

    const roleSelect = screen.getByLabelText(/role/i);
    expect(roleSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /manager/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /administrator/i })).toBeInTheDocument();
  });

  it('shows validation error for short name', async () => {
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), 'A');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'notanemail');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for non-matching passwords', async () => {
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword');

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });
  });

  it('calls register mutation with valid data', async () => {
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.selectOptions(screen.getByLabelText(/role/i), 'administrator');

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'password123',
        role: 'administrator',
      });
    });
  });

  it('clears field error when user types', async () => {
    render(<RegisterForm />);

    // Trigger validation error
    await user.type(screen.getByLabelText(/full name/i), 'A');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    fireEvent.submit(form);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });

    // Type valid name - error should clear
    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');

    await waitFor(() => {
      expect(screen.queryByText(/name must be at least 2 characters/i)).not.toBeInTheDocument();
    });
  });
});
