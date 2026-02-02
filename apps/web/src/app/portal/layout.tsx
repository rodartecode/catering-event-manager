'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { SkipLink } from '@/components/a11y/SkipLink';
import { SessionGuard } from '@/components/auth/SessionGuard';

function CalendarIcon() {
  return (
    <svg
      className="h-8 w-8 text-blue-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

function PortalHeader() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/portal/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link href="/portal" className="flex items-center gap-2">
            <CalendarIcon />
            <span className="text-xl font-semibold text-gray-900">Client Portal</span>
          </Link>

          {/* User Info & Logout */}
          {session?.user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {session.user.name || session.user.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOutIcon />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function PortalContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <SkipLink />
      <PortalHeader />
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={240} // 4 minutes (in seconds)
      refetchOnWindowFocus={true}
    >
      <SessionGuard loginPath="/portal/login">
        <PortalContent>{children}</PortalContent>
      </SessionGuard>
    </SessionProvider>
  );
}
