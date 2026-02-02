## 1. Implementation

- [x] 1.1 ~~Add `export const dynamic = 'force-dynamic'` to health route~~ (insufficient - Next.js 16 + Turbopack still evaluates modules)
- [x] 1.2 Implement lazy database initialization in packages/database/src/client.ts
- [x] 1.3 Revert unnecessary dynamic import changes to API routes

## 2. Verification

- [x] 2.1 Test build locally without DATABASE_URL (should pass)
- [x] 2.2 Test health route still works with DATABASE_URL (runtime behavior unchanged)
- [ ] 2.3 Push and verify CI Build job passes
