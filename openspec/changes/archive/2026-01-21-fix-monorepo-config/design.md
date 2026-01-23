# Design: Monorepo Configuration Fixes

## Problem Analysis

### 1. Module Resolution Failures

**Current state**:
```typescript
// These imports fail
import { db } from '@catering-event-manager/database/client';
import { users } from '@catering-event-manager/database/schema';
```

**Root cause**: `packages/database/package.json` lacks `exports` field for subpath imports.

**Evidence**:
```json
// Current package.json (missing exports)
{
  "name": "@catering-event-manager/database",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

**Solution**: Add exports field:
```json
{
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./client": "./src/client.ts"
  }
}
```

### 2. TypeScript Config Resolution

**Current state**:
```json
// apps/web/tsconfig.json
{
  "extends": "@catering-event-manager/typescript-config/base.json"
}
```

**Root cause**: TypeScript's `extends` with package names requires the package to be a direct dependency and properly configured. The typescript-config package exists but TypeScript cannot resolve it in this monorepo context.

**Solution**: Remove the `extends` clause since the web app already has all necessary compiler options defined locally. The base.json config is redundant.

### 3. NextAuth Type Augmentation

**Current state**:
```typescript
// Errors on session.user.role and user.role
token.role = user.role; // Property 'role' does not exist on type 'User'
```

**Root cause**: NextAuth's default User type doesn't include custom properties like `role`.

**Solution**: Module augmentation in a `.d.ts` file:
```typescript
// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface User extends DefaultUser {
    role: 'administrator' | 'manager';
  }
  interface Session extends DefaultSession {
    user: User & { id: string };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'administrator' | 'manager';
  }
}
```

### 4. tRPC v11 Subscription Changes

**Current state (tRPC v10 pattern)**:
```typescript
const subscription = trpc.event.onStatusChange.subscribe(
  { eventId },
  { onData: (data) => { ... } }
);
```

**tRPC v11 pattern**:
```typescript
trpc.event.onStatusChange.useSubscription(
  { eventId },
  { onData: (data) => { ... } }
);
```

The v11 API uses a hook directly, not a `.subscribe()` method.

### 5. Missing Client Router

**Current state**:
```typescript
// EventForm.tsx
const { data: clients } = trpc.client?.list?.useQuery() || { ... };
```

No `client` router exists in `_app.ts`. The optional chaining (`?.`) was a workaround but causes type errors.

**Solution**: Create a minimal client router that queries the `clients` table.

### 6. Transaction Type

**Current state**:
```typescript
await db.transaction(async (tx) => { // tx implicitly has 'any' type
```

**Solution**: Import and use proper Drizzle transaction type:
```typescript
import type { PgTransaction } from 'drizzle-orm/pg-core';
await db.transaction(async (tx: PgTransaction<...>) => {
```

Or simpler, use type inference by extracting the type:
```typescript
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
```

## Decision Summary

| Issue | Approach | Rationale |
|-------|----------|-----------|
| Module resolution | Add exports to database/package.json | Standard Node.js subpath exports pattern |
| tsconfig extends | Remove extends, keep local config | Avoids complex workspace resolution issues |
| NextAuth types | Module augmentation | Official NextAuth pattern for custom types |
| tRPC subscriptions | Use v11 useSubscription hook | Matches installed tRPC v11 version |
| Client router | Create minimal router | Needed for EventForm functionality |
| Transaction type | Use Drizzle's built-in types | Type-safe without manual annotation |
