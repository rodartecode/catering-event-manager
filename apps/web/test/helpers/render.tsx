import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render as rtlRender } from '@testing-library/react';
import { httpBatchLink } from '@trpc/client';
import type { ReactElement, ReactNode } from 'react';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc';

/**
 * Custom render wrapper for component tests.
 *
 * Provides:
 * - QueryClient with test-friendly defaults (no retries, no refetch)
 * - tRPC provider with mock-friendly client
 *
 * Usage:
 * ```tsx
 * import { render, screen } from '@/test/helpers/render';
 *
 * it('renders component', () => {
 *   render(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */

interface WrapperProps {
  children: ReactNode;
}

/**
 * Create a test QueryClient with disabled retries and refetching.
 * This makes tests faster and more predictable.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Create a mock tRPC client for testing.
 * Uses a noop link that never actually makes requests.
 */
function createMockTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/api/trpc',
        transformer: superjson,
        // In tests, we'll mock the procedures directly
        fetch: async () => {
          return new Response(JSON.stringify({ result: { data: null } }), {
            headers: { 'content-type': 'application/json' },
          });
        },
      }),
    ],
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Custom QueryClient instance. If not provided, a test client is created.
   */
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with all required providers.
 *
 * @param ui - The React element to render
 * @param options - Render options including custom queryClient
 * @returns The render result with additional utilities
 */
function customRender(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const trpcClient = createMockTrpcClient();

  function AllProviders({ children }: WrapperProps) {
    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    );
  }

  return {
    ...rtlRender(ui, { wrapper: AllProviders, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render with our custom version
export { customRender as render };

// Export utilities for advanced use cases
export { createTestQueryClient, createMockTrpcClient };
