'use client';

import { useSession } from 'next-auth/react';

export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { data: session, status } = useSession();

  return {
    isAdmin: session?.user?.role === 'administrator',
    isLoading: status === 'loading',
  };
}
