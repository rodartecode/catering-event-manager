# Pending Version Upgrades

> Last reviewed: 2026-04-08

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
| Go 1.25.8 → 1.26.1 | #33 | 2026-03-30 |
| TypeScript 5.9.3 → 6.0.2 | #44 | 2026-04-01 |
| Batch patch/minor upgrades (Biome, Next.js, Turbo, Playwright, Supabase, React Query, Resend, axe-core) | #44 | 2026-04-01 |
| Go lib/pq 1.12.0 → 1.12.1 + golang.org/x/* security updates | #44 | 2026-04-01 |
| Remove deprecated @types/bcryptjs | #44 | 2026-04-01 |
| Go 1.26.1 → 1.26.2 (crypto/x509, crypto/tls CVEs) | #53 | 2026-04-08 |

---

## Pending Major Upgrades

No pending major upgrades at this time. All dependencies are current.

---

## Go Module Updates (non-blocking)

Indirect/transitive Go dependencies with available updates. Low priority — pulled in by testcontainers, otel, and gRPC. Update opportunistically.

| Module | Current | Available |
|--------|---------|-----------|
| `github.com/jackc/pgx/v5` | 5.8.0 | 5.9.1 |
| `go.opentelemetry.io/contrib/...` | various | various |

Run `cd apps/scheduling-service && go get -u ./... && go mod tidy` to pull latest, then verify with `go test ./...`.
