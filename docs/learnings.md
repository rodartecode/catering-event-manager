# Project Learnings

Session discoveries, debugging patterns, and gotchas accumulated while working on this codebase.

**Usage**: Agents should append new learnings during development using the format below. Read this file at session start to avoid re-learning known issues.

---

## Database & Drizzle

### [2026-01-25] Drizzle ORM 0.45 upgrade

**Problem**: Upgrading Drizzle ORM may require schema syntax changes
**Solution**: Drizzle 0.45 is stable with no breaking changes from 0.36+; simply update the version
**Context**: When upgrading Drizzle, always run `pnpm db:generate` after the upgrade to regenerate types and verify schema compatibility

## tRPC & API Layer

### [2026-01-25] tRPC v11 upgrade from v10

**Problem**: tRPC v11 has API changes from v10
**Solution**: v11 is mostly compatible; key changes are in the client setup and subscription handling
**Context**: The upgrade path is straightforward - update all @trpc/* packages together. Main benefits are improved TypeScript inference and smaller bundle size

## Go Scheduler Service

### [2026-01-24] Testcontainers Go integration patterns

**Problem**: Setting up isolated PostgreSQL tests for Go service without complex mocking
**Solution**: Use testcontainers-go with PostgreSQL module, create complete schema in test setup, and provide cleanup utilities
**Context**:

```go
func SetupTestDB(t *testing.T) *TestDB {
    // Creates isolated PostgreSQL container per test suite
    // Applies full schema matching Drizzle migrations
    // Returns connection + cleanup functions
}
```

Essential for integration testing with real database constraints

### [2026-01-24] Time range overlap testing patterns

**Problem**: Comprehensive testing of scheduling conflict detection requires many edge cases
**Solution**: Created `OverlappingRanges()` helper that provides pre-defined scenarios (fully contained, fully contains, partial overlaps, exact boundaries)
**Context**: Use structured time range testing for any scheduling/calendar functionality. The helper generates 8 standard overlap scenarios that cover all PostgreSQL tstzrange intersection cases

### [2026-01-24] Fiber v3 HTTP testing approach

**Problem**: Testing HTTP handlers requires setting up full Fiber app with middleware
**Solution**: Use `fiber.App.Test()` method with `httptest.NewRequest()` for HTTP-level testing, register routes in test setup
**Context**:

```go
func setupTestApp(t *testing.T) (*fiber.App, *TestDB) {
    app := fiber.New()
    RegisterMiddleware(app)
    RegisterRoutes(app, testDB.DB)
    return app, testDB
}
```

Enables testing full HTTP stack including middleware, routing, and error handling

### [2026-01-24] SQLC + testcontainers schema sync

**Problem**: Go tests need same database schema as TypeScript Drizzle migrations
**Solution**: Embed complete SQL schema in testcontainer setup, matching Drizzle schema exactly including indexes and constraints
**Context**: Critical for hybrid applications - both services must test against identical schema. Copy DDL from `packages/database/drizzle/` to Go test setup

### [2026-03-30] Go 1.26.1 upgrade from 1.25.8

**Problem**: Upgrading to Go 1.26 (major version) with new default Green Tea GC and potential encoding/json v2 behavior changes
**Solution**: Straightforward version bump across go.mod, Dockerfile, CI. Codebase uses no deprecated APIs, no unsafe, no CGO — low risk.
**Context**: Key GODEBUG escape hatches if issues arise: `GOEXPERIMENT=nogreenteagc` (revert GC), `GODEBUG=urlstrictcolons=0` (revert strict URL parsing), `GODEBUG=httpcookiemaxnum=0` (disable cookie limit). New `errors.AsType` generic function available as alternative to manual type assertions in `handlers.go`. Run `go fix ./...` to apply modernizer suggestions.

## Authentication

### [2026-01-25] Edge Runtime compatibility for magic link tokens

**Problem**: `node:crypto` module not available in Edge Runtime, causing magic link token generation to fail
**Solution**: Use Web Crypto API (`crypto.getRandomValues()`) instead of Node.js crypto module
**Context**: When code runs in Next.js middleware or Edge API routes, use Web Crypto API:

```typescript
export function generateMagicToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

This pattern works in both Edge Runtime and Node.js environments

## Build & Tooling

### [2026-01-25] Zod 4 breaking changes from Zod 3

**Problem**: Zod 4 changes error structure and some API names
**Solution**: Key changes to fix:

- `.errors` → `.issues` (error array property renamed)
- `required_error` → `error` (in string/number refinements)
- Error message structure slightly different

**Context**: When upgrading Zod, search for `.errors` and `required_error` across the codebase. These are the most common breaking changes

### [2026-01-25] Tailwind CSS 4 import syntax change

**Problem**: Tailwind 4 changes how CSS is imported in the main stylesheet
**Solution**: Replace directives with new import syntax:

```css
/* Old (Tailwind 3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* New (Tailwind 4) */
@import "tailwindcss";
```

**Context**: Tailwind 4 also changes the config file format. Check the official migration guide for full details

### [2026-01-25] ESLint 9 flat config migration

**Problem**: ESLint 9 deprecates `.eslintrc.*` in favor of `eslint.config.js` flat config
**Solution**: Use the flat config format with explicit imports:

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { /* custom rules */ }
);
```

**Context**: The flat config is more explicit but requires converting existing configs. Most plugins now support flat config

### [2026-01-25] Next.js 16 route conflict resolution

**Problem**: Next.js 16 is stricter about route conflicts between page.tsx and route.ts
**Solution**: Ensure no folder has both `page.tsx` and `route.ts` - they conflict. Use separate paths or API routes in `/api/` subdirectory
**Context**: This is enforced at build time in Next.js 16; the error message clearly indicates which routes conflict

## Testing

### [2026-01-25] Vitest 4.x upgrade compatibility

**Problem**: Vitest 4.x may have breaking changes from 3.x
**Solution**: Vitest 4.x maintains good compatibility. Key considerations:

- Ensure `@vitest/coverage-v8` or `@vitest/coverage-istanbul` match the Vitest version
- Update `vitest.config.ts` if using deprecated options

**Context**: Always run full test suite after Vitest upgrades: `pnpm test`

### [2026-01-25] Test infrastructure status tracking

**Problem**: Test counts can drift from documentation as codebase evolves
**Solution**: After major changes, update test counts in:

- `CONTRIBUTING.md` (Current Test Status section)
- `specs/*/tasks.md` (Tests header section)
- Run `pnpm test` and `go test ./...` to get accurate counts

**Context**: Current status (2026-03-18): 866 TypeScript tests, 41 Go tests

---

## Learning Format

When adding a new learning, use this structure:

```markdown
### [YYYY-MM-DD] Brief title
**Problem**: What went wrong or was confusing
**Solution**: What fixed it or the correct approach
**Context**: When this applies, why it matters
```

Example:

```markdown
### [2026-01-23] tRPC subscription client setup
**Problem**: Real-time updates not reaching the client despite server emitting events
**Solution**: Required explicit `httpSubscriptionLink` in tRPC client config - the default client doesn't include SSE support
**Context**: Always check tRPC client links when subscriptions aren't working; import from `@trpc/client/links/httpSubscriptionLink`
```

### [2026-03-16] Presigned URL upload pattern for document management

**Problem**: Uploading files through tRPC requires base64 encoding, which adds ~33% overhead for large files
**Solution**: Two-step presigned URL flow: `createUploadUrl` (tRPC mutation) → client PUTs file directly to Supabase Storage → `confirmUpload` (tRPC mutation) records metadata in DB
**Context**: Use this pattern for any file upload feature. The storage client (`@/lib/storage`) is server-only. Mock `@/lib/storage` in tests with `vi.mock`. Storage key format: `events/{eventId}/{uuid}/{sanitizedFileName}`

### [2026-03-30] Drizzle migration journal backfill for production

**Problem**: `pnpm db:migrate` failed against production Supabase — Drizzle tried to re-run all migrations because `drizzle.__drizzle_migrations` was empty (earlier migrations were applied via SQL Editor, not drizzle-kit)
**Solution**: Backfill the journal with SHA1 hashes of each migration's SQL content. Drizzle stores `crypto.createHash('sha1').update(sqlFileContent).digest('hex')` in the `hash` column — NOT the migration tag name. After inserting correct hashes for already-applied migrations, `db:migrate` correctly skipped them and only applied new ones.
**Context**: When migrating from manual SQL Editor to automated `db:migrate`, you must seed the journal. Generate hashes with: `node -e "const {createHash}=require('crypto'),fs=require('fs'); console.log(createHash('sha1').update(fs.readFileSync('migration.sql','utf8')).digest('hex'))"`

### [2026-03-30] lint-staged fails when all staged files are Biome-ignored

**Problem**: Committing only migration meta JSON files (in `migrations/meta/`) caused lint-staged to fail — Biome matched them via `*.json` glob but they're in an ignored path, so Biome exited with "No files were processed" error
**Solution**: Added `--no-errors-on-unmatched` flag to the Biome command in `package.json` lint-staged config. This tells Biome to exit 0 when all matched files are ignored.
**Context**: This affects any commit that only touches files in Biome-ignored directories (e.g. migration snapshots, `.next/`, `.vercel/`)
