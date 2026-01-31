/**
 * tRPC mock utilities for component testing.
 *
 * These utilities help mock tRPC queries and mutations without hitting the actual API.
 * Works with the custom render wrapper in render.tsx.
 *
 * Usage:
 * ```tsx
 * import { mockTrpcQuery, mockTrpcMutation } from '@/test/helpers/trpc-mock';
 * import { mockEvent } from '@/test/helpers/component-factories';
 *
 * // Mock a query before rendering
 * mockTrpcQuery('event.list', {
 *   items: [mockEvent()],
 *   nextCursor: null,
 * });
 *
 * // Mock a mutation
 * mockTrpcMutation('event.create', mockEvent());
 * ```
 */

import { vi } from 'vitest';

// Store for mocked responses
const mockResponses = new Map<string, unknown>();
const mockMutationHandlers = new Map<string, (input: unknown) => unknown>();
const mockErrors = new Map<string, Error>();

/**
 * Reset all mocked responses. Call in beforeEach for test isolation.
 */
export function resetTrpcMocks() {
  mockResponses.clear();
  mockMutationHandlers.clear();
  mockErrors.clear();
}

/**
 * Mock a tRPC query to return specific data.
 *
 * @param path - The tRPC path (e.g., 'event.list', 'clients.getById')
 * @param data - The data to return
 *
 * @example
 * ```tsx
 * mockTrpcQuery('event.list', {
 *   items: [mockEvent({ eventName: 'Test' })],
 *   nextCursor: null,
 * });
 * ```
 */
export function mockTrpcQuery<T>(path: string, data: T): void {
  mockResponses.set(path, data);
}

/**
 * Mock a tRPC mutation to return specific data or use a handler.
 *
 * @param path - The tRPC path (e.g., 'event.create', 'task.updateStatus')
 * @param dataOrHandler - Static data to return OR a function that receives input
 *
 * @example
 * ```tsx
 * // Static response
 * mockTrpcMutation('event.create', mockEvent());
 *
 * // Dynamic response based on input
 * mockTrpcMutation('event.create', (input) => ({
 *   ...mockEvent(),
 *   eventName: input.eventName,
 * }));
 * ```
 */
export function mockTrpcMutation<T>(
  path: string,
  dataOrHandler: T | ((input: unknown) => T)
): void {
  if (typeof dataOrHandler === 'function') {
    mockMutationHandlers.set(path, dataOrHandler as (input: unknown) => unknown);
  } else {
    mockResponses.set(path, dataOrHandler);
  }
}

/**
 * Mock a tRPC query or mutation to throw an error.
 *
 * @param path - The tRPC path
 * @param error - The error to throw (defaults to a generic error)
 *
 * @example
 * ```tsx
 * mockTrpcError('event.getById', new Error('Event not found'));
 * ```
 */
export function mockTrpcError(path: string, error?: Error): void {
  mockErrors.set(path, error ?? new Error(`Mocked error for ${path}`));
}

/**
 * Get the mocked response for a path.
 * Used internally by the mock tRPC client.
 */
export function getMockedResponse(path: string, input?: unknown): unknown {
  // Check for errors first
  if (mockErrors.has(path)) {
    throw mockErrors.get(path);
  }

  // Check for mutation handlers
  if (mockMutationHandlers.has(path)) {
    const handler = mockMutationHandlers.get(path)!;
    return handler(input);
  }

  // Return static response
  return mockResponses.get(path) ?? null;
}

/**
 * Check if a path has been mocked.
 */
export function hasMockedResponse(path: string): boolean {
  return mockResponses.has(path) || mockMutationHandlers.has(path) || mockErrors.has(path);
}

// ============================================================================
// React Query Mock Helpers
// ============================================================================

/**
 * Create a mock useQuery result for components that use tRPC queries directly.
 *
 * @param data - The data to return
 * @param overrides - Override any useQuery properties
 *
 * @example
 * ```tsx
 * vi.mocked(trpc.event.list.useQuery).mockReturnValue(
 *   mockUseQueryResult([mockEvent()])
 * );
 * ```
 */
export function mockUseQueryResult<T>(
  data: T,
  overrides: Partial<{
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    isSuccess: boolean;
    isFetching: boolean;
    refetch: () => void;
  }> = {}
) {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: true,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

/**
 * Create a mock useQuery result in loading state.
 */
export function mockUseQueryLoading() {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    isSuccess: false,
    isFetching: true,
    refetch: vi.fn(),
  };
}

/**
 * Create a mock useQuery result in error state.
 *
 * @param error - The error to return
 */
export function mockUseQueryError(error: Error = new Error('Query failed')) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error,
    isSuccess: false,
    isFetching: false,
    refetch: vi.fn(),
  };
}

/**
 * Create a mock useMutation result for components that use tRPC mutations.
 *
 * @param overrides - Override any useMutation properties
 *
 * @example
 * ```tsx
 * const mutate = vi.fn();
 * vi.mocked(trpc.event.create.useMutation).mockReturnValue(
 *   mockUseMutationResult({ mutate })
 * );
 * ```
 */
export function mockUseMutationResult(
  overrides: Partial<{
    mutate: (input: unknown) => void;
    mutateAsync: (input: unknown) => Promise<unknown>;
    isLoading: boolean;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
    isSuccess: boolean;
    data: unknown;
    reset: () => void;
  }> = {}
) {
  const mutate = overrides.mutate ?? vi.fn();
  const mutateAsync = overrides.mutateAsync ?? vi.fn().mockResolvedValue(undefined);

  return {
    mutate,
    mutateAsync,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
    data: undefined,
    reset: vi.fn(),
    ...overrides,
  };
}

/**
 * Create a mock useMutation result in pending state.
 */
export function mockUseMutationPending() {
  return mockUseMutationResult({
    isLoading: true,
    isPending: true,
  });
}

/**
 * Create a mock useMutation result in error state.
 *
 * @param error - The error to return
 */
export function mockUseMutationError(error: Error = new Error('Mutation failed')) {
  return mockUseMutationResult({
    isError: true,
    error,
  });
}

/**
 * Create a mock useMutation result in success state.
 *
 * @param data - The data returned by the mutation
 */
export function mockUseMutationSuccess<T>(data: T) {
  return mockUseMutationResult({
    isSuccess: true,
    data,
  });
}

// ============================================================================
// Subscription Mock Helpers
// ============================================================================

/**
 * Create a mock useSubscription result for components using tRPC subscriptions.
 *
 * @param data - The subscription data
 * @param overrides - Override any useSubscription properties
 */
export function mockUseSubscriptionResult<T>(
  data: T | undefined,
  overrides: Partial<{
    status: 'idle' | 'connecting' | 'pending' | 'error';
    error: Error | null;
  }> = {}
) {
  return {
    data,
    status: 'pending' as const,
    error: null,
    ...overrides,
  };
}
