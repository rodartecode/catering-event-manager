# Pending Version Upgrades

> Last reviewed: 2026-03-29

Tracks major dependency upgrades — blockers, peer dep constraints, and recommended upgrade path.

---

## Quick-Win Minor/Patch Upgrades

These have no blockers. Next Dependabot cycle will pick them up, or run `pnpm update` manually.

| Package | Current | Available | Notes |
|---------|---------|-----------|-------|
| `@biomejs/biome` | 2.4.8 | 2.4.9 | Also update `biome.json` `$schema` URL |
| `@next/eslint-plugin-next` | 16.2.0 | 16.2.1 | Patch |
| `@supabase/supabase-js` | 2.99.3 | 2.100.1 | Minor |
| `@tanstack/react-query` | 5.91.2 | 5.95.2 | Minor |
| `@vitest/*` + `vitest` | 4.1.0 | 4.1.2 | Patch |
| `drizzle-orm` | 0.45.1 | 0.45.2 | Patch |
| `next` | 16.2.0 | 16.2.1 | Patch |
| `typescript-eslint` | 8.57.1 | 8.57.2 | Patch |
| `turbo` | 2.8.20 | 2.8.21 | Patch |
| `@trpc/*` | 11.13.4 | 11.16.0 | Minor (semver range allows it) |
| `@vitejs/plugin-react` | 5.1.3 | 5.2.0 | Minor — adds Vite 8 peer dep support |

---

## Major Upgrades

### 1. jsdom 28 → 29 — PR #24 (in progress)

- **Status**: PR open, awaiting Dependabot rebase onto `main`
- **Breaking change**: Minimum Node.js v22.13.0+ for the v22 line. We use Node 20 LTS — fine since jsdom is a dev dependency and CI passes on Node 20.
- **Action**: Merge after CI goes green post-rebase
- **Risk**: Low — unit tests, E2E, and quality gates all pass on this branch

### 2. Vite 7 → 8 + plugin-react 5 → 6

- **Status**: Deferred. PR #25 closed 2026-03-29.
- **Blocker**: `@vitejs/plugin-react@6` requires `vite@^8.0.0`
- **Key finding**: Vitest 4.x already supports Vite 8 (`vite: ^6 || ^7 || ^8`), so Vitest does **not** need upgrading. Also, `@vitejs/plugin-react@5.2.0` already added `vite@^8.0.0` to its peer deps.

**Upgrade path:**
1. Bump `vite` to 8.x in `apps/web/package.json`
2. Choose one:
   - `@vitejs/plugin-react@5.2.0` — adds Vite 8 support, keeps Babel (safe, minimal change)
   - `@vitejs/plugin-react@6.x` — removes Babel entirely (safe for us — we pass zero Babel options)
3. Run full test suite (`pnpm test`, `pnpm build`, `pnpm lint`)

**Vite 8 breaking changes to verify:** Rolldown replaces Rollup as the bundler. Our vitest config is simple (`plugins: [react()]`) so impact should be minimal. Check for any Rollup-specific plugins or config.

**Scope**: S — `apps/web/package.json`, `pnpm-lock.yaml`

### 3. ESLint 9 → 10

- **Status**: Deferred. PR #26 closed 2026-03-15.
- **Previous blocker**: `typescript-eslint@8` peer dep was `^8.57.0 || ^9.0.0`
- **Blocker resolved**: `typescript-eslint@latest` now supports `^8.57.0 || ^9.0.0 || ^10.0.0`
- **Breaking changes**: Removes eslintrc format (we already use flat config), removes `--ext` flag, removes several deprecated APIs

**Upgrade steps:**
1. Bump `eslint` to 10.x + `@eslint/js` to 10.x in `apps/web/package.json`
2. Bump `typescript-eslint` to latest
3. Verify `apps/web/eslint.config.mjs` — should work as-is with flat config
4. Run `pnpm lint` to validate
5. Un-ignore the Dependabot major version: comment `@dependabot unignore @eslint/js` on a new PR or manually bump

**Scope**: S — `eslint.config.mjs`, `apps/web/package.json`

### 4. TypeScript 5 → 6

- **Status**: Available (6.0.2 released)
- **Blocker**: `typescript-eslint@8` peer dep is `>=4.8.4 <6.0.0` — does **not** support TS 6 yet
- **Action**: Wait for `typescript-eslint` to ship TS 6 support, then upgrade together
- **Risk**: Medium — TS major versions often introduce stricter type checks across the codebase

**Scope**: M — `tsconfig.json` files, potential type errors across `apps/web/`, `packages/`

### 5. Go 1.25.7 → 1.25.8

- **Status**: Not yet released
- **Why**: `govulncheck` reports GO-2026-4601 (net/url IPv6 parsing) and GO-2026-4602 (os FileInfo escape) fixed in 1.25.8. CI has `continue-on-error: true` as a workaround.
- **Action**: Bump when Go 1.25.8 is released

**Files to update:**
- `apps/scheduling-service/go.mod` — `go 1.25.8`
- `.github/workflows/ci.yml` — `GO_VERSION: '1.25.8'`
- `apps/scheduling-service/Dockerfile` — `golang:1.25.8-alpine`

**Scope**: S

---

## Recommended Upgrade Order

| Priority | Upgrade | Blocked? | Scope |
|----------|---------|----------|-------|
| **Now** | Merge PR #24 (jsdom 29) | No — awaiting rebase | S |
| **Now** | Minor/patch catch-up (`pnpm update`) | No | S |
| **Soon** | ESLint 10 | No — blocker resolved | S |
| **Soon** | Vite 8 + plugin-react | No — Vitest 4 supports it | S |
| **Wait** | TypeScript 6 | Yes — typescript-eslint `<6.0.0` | M |
| **Wait** | Go 1.25.8 | Yes — not released | S |

---

## Go Module Updates (non-blocking)

Indirect/transitive Go dependencies with available updates. Low priority — these are pulled in by testcontainers, otel, and gRPC. Update opportunistically.

| Module | Current | Available |
|--------|---------|-----------|
| `github.com/jackc/pgx/v5` | 5.8.0 | 5.9.1 |
| `github.com/klauspost/compress` | 1.18.4 | 1.18.5 |
| `go.opentelemetry.io/contrib/...` | various | various |
| `github.com/containerd/typeurl/v2` | 2.2.0 | 2.2.3 |

Run `cd apps/scheduling-service && go get -u ./... && go mod tidy` to pull latest, then verify with `go test ./...`.
