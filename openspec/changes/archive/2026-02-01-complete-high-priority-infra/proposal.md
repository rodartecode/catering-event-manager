# Proposal: complete-high-priority-infra

## Summary

Complete two high-priority Phase 8 infrastructure tasks: verify session management implementation (T167) and configure database connection pooling to support 200 concurrent connections (T178).

## Motivation

These tasks are blocking production readiness:
- **T167**: Session auto-refresh ensures users don't experience unexpected logouts during active work
- **T178**: Connection pooling prevents database connection exhaustion under load (SC-007: 50+ concurrent events)

## Current State

### Session Management (T167)
The implementation already exists but needs validation:
- ✅ NextAuth v5 configured with `maxAge=24h`, `updateAge=4min`
- ✅ SessionProvider in dashboard layout: `refetchInterval={240}` (4 min), `refetchOnWindowFocus={true}`
- ✅ SessionGuard component redirects expired sessions with `error=SessionExpired`
- ✅ tRPC QueryClient handles UNAUTHORIZED errors with signOut redirect
- ❓ End-to-end behavior not validated with tests

### Connection Pooling (T178)
Current pool sizes are insufficient:
- TypeScript (postgres.js): `max: 10` connections
- Go service: `SetMaxOpenConns(25)` connections
- Target: 200 total connections shared across services

## Proposed Changes

### 1. Session Management Validation
Mark T167 as complete after verifying existing implementation matches spec requirements:
- Verify SessionProvider refetchInterval aligns with NextAuth updateAge
- Verify SessionGuard redirects work for dashboard and portal
- Ensure LoginForm displays SessionExpired message

### 2. Connection Pooling Configuration
Update pool sizes proportionally (TypeScript handles CRUD, Go handles scheduling):
- TypeScript client: 150 connections (75% of pool for primary workload)
- Go service: 50 connections (25% for conflict detection)
- Add idle timeout and connection lifetime settings for cleanup

## Impact

- **session-management spec**: No changes needed - implementation already matches requirements
- **NEW connection-pooling spec**: Add requirements for pool sizes and configuration

## Related Specs

- `session-management` - Existing spec (3 requirements)
- `production-readiness` - Related to SC-007 concurrent events
