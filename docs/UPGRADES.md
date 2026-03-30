# Pending Version Upgrades

> Last reviewed: 2026-03-30

Tracks major dependency upgrades — blockers, peer dep constraints, and recommended upgrade path.

## Recently Completed

| Upgrade | PR | Date |
|---------|-----|------|
| jsdom 28 → 29 | #24 | 2026-03-29 |
| Minor/patch catch-up | #28 | 2026-03-29 |
| ESLint 9 → 10 (then removed) | #29, #32 | 2026-03-29/30 |
| Vite 7 → 8 | #30 | 2026-03-29 |
| ESLint → Biome (linting) | #32 | 2026-03-30 |
| Go 1.25.7 → 1.25.8 | #32 | 2026-03-30 |

---

## Pending Major Upgrades

### 1. TypeScript 5 → 6

- **Status**: Available (6.0.2 released)
- **Previous blocker**: `typescript-eslint@8` peer dep `<6.0.0` — **no longer applies** since ESLint was removed in favor of Biome
- **Risk**: Medium — TS major versions often introduce stricter type checks across the codebase
- **Action**: Can upgrade when ready. Test with `pnpm type-check` across all packages.

**Scope**: M — `tsconfig.json` files, potential type errors across `apps/web/`, `packages/`

### 2. @vitejs/plugin-react 5 → 6

- **Status**: Available (6.0.1). PR #25 was closed, major version ignored in Dependabot.
- **Context**: Vite 8 is already installed (PR #30). plugin-react 5.2.0 supports Vite 8. Version 6 removes Babel entirely (safe — we pass zero Babel options).
- **Action**: Optional. No functional benefit since 5.2.0 already works with Vite 8.

**Scope**: S — `apps/web/package.json`

---

## Go Module Updates (non-blocking)

Indirect/transitive Go dependencies with available updates. Low priority — pulled in by testcontainers, otel, and gRPC. Update opportunistically.

| Module | Current | Available |
|--------|---------|-----------|
| `github.com/jackc/pgx/v5` | 5.8.0 | 5.9.1 |
| `github.com/klauspost/compress` | 1.18.4 | 1.18.5 |
| `go.opentelemetry.io/contrib/...` | various | various |
| `github.com/containerd/typeurl/v2` | 2.2.0 | 2.2.3 |

Run `cd apps/scheduling-service && go get -u ./... && go mod tidy` to pull latest, then verify with `go test ./...`.
