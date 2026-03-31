'use client';

import { SessionProvider } from 'next-auth/react';
import { SkipLink } from '@/components/a11y/SkipLink';
import { SessionGuard } from '@/components/auth/SessionGuard';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { NotificationBell } from '@/components/notifications';
import { SearchBar } from '@/components/search/SearchBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={240} // 4 minutes (in seconds)
      refetchOnWindowFocus={true}
    >
      <SessionGuard loginPath="/login">
        <SkipLink />
        <div className="flex min-h-screen bg-gray-100">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
            <Sidebar />
          </div>

          {/* Mobile Navigation */}
          <MobileNav />

          {/* Main Content */}
          <main id="main-content" className="flex-1 lg:ml-64">
            <div className="sticky top-0 z-20 bg-gray-100 px-4 py-3 lg:px-8 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <SearchBar />
                </div>
                <NotificationBell />
              </div>
            </div>
            {children}
          </main>
        </div>
      </SessionGuard>
    </SessionProvider>
  );
}
