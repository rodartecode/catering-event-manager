'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { TRPCClientError } from '@trpc/client';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import superjson from 'superjson';
import { Toaster } from 'react-hot-toast';
import { signOut } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            retry: (failureCount, error) => {
              // Don't retry on auth errors
              if (error instanceof TRPCClientError) {
                const code = error.data?.code;
                if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') {
                  return false;
                }
              }
              return failureCount < 1;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            onError: (error) => {
              if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
                signOut({ callbackUrl: '/login?error=SessionExpired' });
              }
            },
          },
        },
      })
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
