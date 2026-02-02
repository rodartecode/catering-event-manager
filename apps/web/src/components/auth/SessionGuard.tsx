'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

interface SessionGuardProps {
  children: React.ReactNode;
  loginPath?: string;
}

export function SessionGuard({ children, loginPath = '/login' }: SessionGuardProps) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated' && !hasRedirected.current) {
      hasRedirected.current = true;
      const redirectUrl = `${loginPath}?callbackUrl=${encodeURIComponent(pathname)}&error=SessionExpired`;
      router.replace(redirectUrl);
    }
  }, [status, router, pathname, loginPath]);

  useEffect(() => {
    if (status === 'authenticated') {
      hasRedirected.current = false;
    }
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}
