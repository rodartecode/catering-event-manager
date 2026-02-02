import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Skip auth for static assets and icons
  if (pathname === '/icon.svg' || pathname === '/favicon.ico') {
    return;
  }

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Redirect authenticated users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  // Protected routes - everything except auth pages, API routes, and static assets
  const isProtectedRoute =
    pathname === '/' ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/analytics');

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$|.*\\.ico$).*)'],
};
