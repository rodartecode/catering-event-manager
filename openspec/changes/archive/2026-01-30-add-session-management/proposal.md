# Change: Add Session Management

## Why
Users may experience unexpected logouts during long work sessions because the current NextAuth configuration lacks explicit session refresh. Task T167 requires automatic token refresh to maintain sessions.

## What Changes
- Configure explicit session maxAge (24 hours) and updateAge (4 minutes) in NextAuth
- Add SessionProvider refetchInterval for silent background refresh
- Create SessionGuard component for client-side session monitoring
- Handle tRPC UNAUTHORIZED errors with automatic redirect
- Show session expired message on login page

## Impact
- Affected specs: None (new capability)
- Affected code: `apps/web/src/server/auth.ts`, dashboard layout, portal layout, providers, LoginForm
