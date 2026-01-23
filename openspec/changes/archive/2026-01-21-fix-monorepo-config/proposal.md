# Proposal: Fix Monorepo Configuration Issues

## Why

The project has 18 pre-existing TypeScript errors that prevent clean type-checking. These errors fall into several categories:

1. **Module Resolution Failures** (7 errors): TypeScript cannot resolve imports from `@catering-event-manager/database/client` and `@catering-event-manager/database/schema`. The packages exist but lack proper exports configuration.

2. **Missing TypeScript Config** (1 error): Web app extends `@catering-event-manager/typescript-config/base.json` but TypeScript cannot resolve the package reference.

3. **NextAuth Type Augmentation Missing** (5 errors): The custom `role` property on User/Session types is not recognized because NextAuth type declarations have not been augmented.

4. **tRPC v11 API Changes** (3 errors): Code uses tRPC v10 subscription patterns (`.subscribe()`) but tRPC v11 changed the subscription API.

5. **Missing Client Router** (1 error): EventForm references `trpc.client?.list` but no client router exists.

6. **Implicit Any Types** (1 error): Transaction callback parameter lacks type annotation.

These errors block CI/CD pipelines, IDE type checking, and developer confidence.

## What Changes

### 1. Database Package Exports
Add explicit exports configuration to `packages/database/package.json` so subpath imports work:
- `@catering-event-manager/database/schema` → `./src/schema/index.ts`
- `@catering-event-manager/database/client` → `./src/client.ts`

### 2. TypeScript Config Package Resolution
Either:
- Add the typescript-config package to web app's dependencies, or
- Remove the `extends` clause and inline the base config (simpler, avoids dependency issues)

### 3. NextAuth Type Augmentation
Create `apps/web/src/types/next-auth.d.ts` with module augmentation for `User` and `Session` types to include `role` and `id` properties.

### 4. tRPC v11 Subscription API
Update event detail page to use the correct tRPC v11 subscription API (`useSubscription` hook instead of `.subscribe()` method).

### 5. Client Router Placeholder
Either:
- Create a minimal client router with list query, or
- Remove the client selection from EventForm until properly implemented

### 6. Transaction Type Annotation
Add explicit type annotation for the transaction callback parameter in event.ts.

## Impact

- **Risk**: Low - these are configuration and type fixes, no runtime behavior changes
- **Scope**: Web app and database package only
- **Breaking changes**: None
- **Verification**: `pnpm type-check` should pass with 0 errors after these fixes
