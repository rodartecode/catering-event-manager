# CLAUDE.md - Test Helpers

Test infrastructure for tRPC router integration tests and component unit tests.

## Files

| File | Purpose | Used By |
|------|---------|---------|
| `db.ts` | PostgreSQL TestContainer setup, schema creation | Router tests |
| `trpc.ts` | Authenticated tRPC caller factory (`createAdminCaller`, etc.) | Router tests |
| `factories.ts` | DB factory functions (INSERT real records) | Router tests |
| `input-factories.ts` | Re-exports all factories as a convenience barrel | Router tests |
| `render.tsx` | Custom RTL render with QueryClient + tRPC provider | Component tests |
| `trpc-mock.ts` | Mock tRPC procedures without real API | Component tests |
| `component-factories.ts` | Pure object factories (no DB) for component props | Component tests |
| `axe.ts` | vitest-axe setup for WCAG 2.1 AA checks | Component tests |

## Critical Gotcha: Test DB Schema Sync

**`db.ts` uses `runMigrations()` with raw SQL to create the test schema.** When adding new database columns or tables:

1. Update the Drizzle schema in `packages/database/src/schema/`
2. **Also update the test helper SQL in `db.ts`**

Forgetting step 2 causes `column does not exist` errors across ALL test suites, not just new tests. This is the #1 source of test failures after schema changes.

## Two Factory Systems

**`factories.ts`** (DB factories): Create real database records via INSERT. Require a `TestDatabase` instance. Use `resetFactoryCounter()` in `beforeEach`.
```typescript
const client = await createClient(db);
const event = await createEvent(db, { clientId: client.id });
```

**`component-factories.ts`** (mock factories): Return plain objects matching component prop shapes. No database needed. Have their own counter.
```typescript
const event = mockEvent({ status: 'planning' });
```

## Test Caller Pattern

```typescript
const { db, cleanup } = await setupTestDatabase();
const caller = createAdminCaller(db);
const result = await caller.event.create({ ... });
```

Pre-built test users: `testUsers.admin` and `testUsers.manager` with hardcoded IDs.

## Accessibility Testing

`axe.ts` extends `expect` with `.toHaveNoViolations()`. Color contrast checks are disabled in JSDOM (unreliable). Real a11y testing requires Playwright quality gates.

## Related

- Parent: `../../CLAUDE.md`
- Component patterns: `../../src/components/CLAUDE.md`
- Server layer: `../../src/server/CLAUDE.md`
