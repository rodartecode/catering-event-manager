# CLAUDE.md - Shared Utilities

Core utilities, clients, and helpers for the Next.js application.

## Files

| File | Purpose | Server/Client |
|------|---------|---------------|
| `auth.ts` | Server auth guards (`requireAuth`, `requireAdmin`) | Server |
| `auth-utils.ts` | Password hashing (bcryptjs) | Server |
| `use-auth.ts` | `useIsAdmin()` React hook | Client |
| `trpc.ts` | tRPC React Query client + `RouterOutput` type | Client |
| `storage.ts` | Supabase Storage client for document uploads | Server |
| `email.ts` | Resend email client (magic links, digests) | Server |
| `logger.ts` | Structured JSON logger (replaces `console.*`) | Both |
| `env.ts` | Zod-validated environment variables | Server |
| `errors.ts` | `AppError` class + tRPC error conversion | Server |
| `rate-limit.ts` | Sliding window rate limiter (Redis + in-memory fallback) | Server |
| `form-a11y.ts` | Form accessibility ID generators | Both |
| `form-utils.ts` | Form helper utilities | Both |
| `export-utils.ts` | Client-side CSV export | Client |
| `gantt-layout.ts` | Gantt chart layout calculations | Both |
| `redis.ts` | Upstash Redis client | Server |

## Initialization Patterns

Two patterns coexist -- know which applies:

**Lazy init** (`storage.ts`, `email.ts`): Client created on first call via getter function. Safe for build time when env vars are missing.
```typescript
// Correct: call the getter
const client = getStorageClient();
// Wrong: importing a module-level client
```

**Eager init** (`env.ts`): Zod parse at module evaluation. Crashes if required vars are missing. This is intentional for fail-fast validation.

## Gotchas

- **`storage.ts`**: Was changed from eager to lazy init because it broke Next.js builds. Tests mock via `vi.mock('@/lib/storage', () => ({ getStorageClient: () => ({...}) }))`.
- **`email.ts`**: Lazy init but throws (not null) when `RESEND_API_KEY` is missing.
- **`logger.ts`**: Only file allowed to use `console.*`. All other code must use `logger.info/error/warn`.
- **`rate-limit.ts`**: In-memory fallback doesn't persist across serverless invocations. Three tiers: general (100/min), auth (5/min), magic links (3/5min).
- **`use-auth.ts`**: Client-only hook. For server-side auth checks, use `auth.ts` guards.

## Related

- Parent: `../../CLAUDE.md`
- Server layer: `../server/CLAUDE.md`
