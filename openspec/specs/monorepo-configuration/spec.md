# monorepo-configuration Specification

## Purpose
TBD - created by archiving change fix-monorepo-config. Update Purpose after archive.
## Requirements
### Requirement: Type-safe package imports

The database package MUST support subpath imports for both schema and client modules.

**Priority**: P0
**Status**: Draft

#### Scenario: Import schema from database package
- **Given** a TypeScript file in the web app
- **When** importing `@catering-event-manager/database/schema`
- **Then** TypeScript resolves the import without errors
- **And** all exported types and tables are available

#### Scenario: Import client from database package
- **Given** a TypeScript file in the web app
- **When** importing `@catering-event-manager/database/client`
- **Then** TypeScript resolves the import without errors
- **And** the `db` client instance is available

### Requirement: NextAuth type safety

Authentication types MUST include custom properties for role-based access control.

**Priority**: P0
**Status**: Draft

#### Scenario: Access user role from session
- **Given** an authenticated user session
- **When** accessing `session.user.role`
- **Then** TypeScript recognizes `role` as a valid property
- **And** the type is `'administrator' | 'manager'`

#### Scenario: Access user role in JWT callback
- **Given** a JWT callback in NextAuth configuration
- **When** accessing `user.role` from the user parameter
- **Then** TypeScript recognizes `role` as a valid property
- **And** the type is `'administrator' | 'manager'`

### Requirement: Near-real-time data freshness

Event and task data MUST stay current using polling until subscription infrastructure (Redis Pub/Sub, SSE transport) is built.

**Priority**: P1
**Status**: Draft

#### Scenario: Event detail page reflects recent changes
- **Given** an event detail page component
- **When** the page is open and another user updates the event status
- **Then** the `useQuery` hook refetches data on a polling interval (default 5 seconds)
- **And** the updated status is visible without a manual page refresh

### Requirement: Clean type checking

The project MUST pass TypeScript type checking without errors.

**Priority**: P0
**Status**: Draft

#### Scenario: Run type-check command
- **Given** all source files in the monorepo
- **When** running `pnpm type-check`
- **Then** the command completes with exit code 0
- **And** no TypeScript errors are reported

