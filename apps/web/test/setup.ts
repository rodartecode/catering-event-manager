import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// Mock the database client to prevent eager connection during module load
// Tests use their own Testcontainer database via the test helpers
vi.mock('@catering-event-manager/database/client', () => ({
  db: null, // Will be overridden by test helpers
}));

// Mock the auth module - NextAuth tries to import next/server which doesn't work in tests
// Tests inject sessions directly via the test caller context
vi.mock('@/server/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
  // Portal magic link functions
  generateMagicToken: vi.fn().mockReturnValue('test-token-123'),
  createMagicLinkToken: vi.fn().mockResolvedValue('test-token-123'),
  verifyMagicLinkToken: vi.fn().mockResolvedValue(null),
}));

// Mock the email module - no real emails in tests
vi.mock('@/lib/email', () => ({
  sendMagicLinkEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock next/navigation
beforeAll(() => {
  // Mock useRouter
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  }));
});

// Global test timeout for async operations
afterAll(async () => {
  // Allow pending timers to resolve
  await new Promise((resolve) => setTimeout(resolve, 100));
});

// Suppress console errors during tests (optional, remove if you want to see them)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress React act() warnings and other noisy errors
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('act(') ||
        message.includes('Warning: ReactDOM.render') ||
        message.includes('Warning: An update to'))
    ) {
      return;
    }
    originalError.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalError;
});
