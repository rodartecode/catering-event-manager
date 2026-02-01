import { render, screen, fireEvent, waitFor } from '../../../test/helpers/render';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { signIn } from 'next-auth/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe } from '../../../test/helpers/axe';

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
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

describe('LoginForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form with all fields', () => {
    render(<LoginForm />);

    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders link to register page', () => {
    render(<LoginForm />);

    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/register');
  });

  it('shows validation error for invalid email', async () => {
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), 'notanemail');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Use fireEvent.submit to ensure form submission triggers
    const form = screen.getByRole('button', { name: /sign in/i }).closest('form')!;
    fireEvent.submit(form);

    // Wait for async validation to complete and error to render
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for empty password', async () => {
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');

    // Use fireEvent.submit to bypass HTML5 required validation
    const form = screen.getByRole('button', { name: /sign in/i }).closest('form')!;
    fireEvent.submit(form);

    // Wait for async validation
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('calls signIn with credentials on valid submit', async () => {
    vi.mocked(signIn).mockResolvedValue({ error: undefined, ok: true, status: 200, url: '' } as never);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'test@example.com',
      password: 'password123',
      redirect: false,
    });
  });

  it('shows error message on failed login', async () => {
    vi.mocked(signIn).mockResolvedValue({ error: 'CredentialsSignin', ok: false, status: 401, url: '' } as never);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('shows loading state while submitting', async () => {
    // Make signIn hang to test loading state
    vi.mocked(signIn).mockImplementation(() => new Promise(() => {}));

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('clears field error when user types', async () => {
    render(<LoginForm />);

    // Trigger validation error
    await user.type(screen.getByLabelText(/email address/i), 'notanemail');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Use fireEvent.submit to ensure form submission triggers
    const form = screen.getByRole('button', { name: /sign in/i }).closest('form')!;
    fireEvent.submit(form);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });

    // Type valid email - error should clear
    await user.clear(screen.getByLabelText(/email address/i));
    await user.type(screen.getByLabelText(/email address/i), 'valid@example.com');

    // Wait for React state to update
    await waitFor(() => {
      expect(screen.queryByText(/invalid email address/i)).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<LoginForm />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('form fields have proper labels', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('submit button is focusable and has accessible name', () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toHaveAttribute('tabindex', '-1');
    });
  });
});
