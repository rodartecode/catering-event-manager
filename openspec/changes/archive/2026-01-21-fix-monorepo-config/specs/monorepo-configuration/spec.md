# Monorepo Configuration

## ADDED Requirements

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

### Requirement: tRPC subscription compatibility

Real-time subscriptions MUST use the correct API for tRPC v11.

**Priority**: P1
**Status**: Draft

#### Scenario: Subscribe to event status changes
- **Given** an event detail page component
- **When** setting up a subscription to `event.onStatusChange`
- **Then** the subscription uses tRPC v11's `useSubscription` hook
- **And** TypeScript accepts the subscription configuration without errors

### Requirement: Clean type checking

The project MUST pass TypeScript type checking without errors.

**Priority**: P0
**Status**: Draft

#### Scenario: Run type-check command
- **Given** all source files in the monorepo
- **When** running `pnpm type-check`
- **Then** the command completes with exit code 0
- **And** no TypeScript errors are reported
