# Session: Post-Deploy Verification — Infra/DevOps Hardening

**Date**: 2026-02-08
**Branch**: `main`
**Change**: `infra-devops-hardening`

## Objective

Verify CI pipeline after all infra-devops-hardening branches were merged. Diagnose and fix failures to get all jobs green.

## CI Failures Found & Fixed

### 1. Go Version Mismatch (commit `d5ed1b0`)
- **Problem**: CI `GO_VERSION: '1.23'` but `go.mod` requires `go 1.25.0`. Go tests failed with `go: no such tool "covdata"`, govulncheck couldn't load packages.
- **Fix**: Updated `.github/workflows/ci.yml` `GO_VERSION` to `'1.25'`.

### 2. Biome Schema Drift (commit `d5ed1b0`)
- **Problem**: `biome.json` schema URL was `2.3.13` but Dependabot had bumped installed version to `2.3.14`. Formatting rules changed between versions.
- **Fix**: Updated schema to `2.3.14`, ran `pnpm install --frozen-lockfile` to sync, fixed formatting in `apps/web/src/lib/export-utils.ts`.

### 3. Dockerfile Issues (commit `833ea28`)
- **Problem**: `apps/scheduling-service/Dockerfile` used `golang:1.24-alpine` (needs 1.25). `apps/web/Dockerfile` referenced non-existent `packages/config/eslint-config/package.json` and `tailwind-config/package.json`.
- **Fix**: Bumped Go image to `1.25-alpine`, removed the two COPY lines for empty config packages.

### 4. Missing Public Directory (commit `1ce750e`)
- **Problem**: `apps/web/public/` is empty and not tracked by Git. Docker COPY step failed in CI.
- **Fix**: Added `apps/web/public/.gitkeep`.

## Verification Results

| Task | Status | Notes |
|------|--------|-------|
| 8.1 Feature branch CI | Done | Security-audit runs, publish skipped on non-main |
| 8.2 Main branch CI | Done | GHCR publishes both images, production deploys |
| 8.3 Staging deploy | Deferred | Needs staging secrets configured |
| 8.4 Dependabot scan | Done | Results visible in GitHub Security tab |

## Commits

1. `d5ed1b0` — fix(ci): bump Go to 1.25 and align Biome to 2.3.14
2. `833ea28` — fix(docker): bump Go to 1.25 and remove missing config package refs
3. `1ce750e` — fix(docker): add .gitkeep to apps/web/public for Docker build
4. `43936f6` — docs: mark infra-devops-hardening verification tasks 8.1, 8.2, 8.4 done

## Outstanding

- **Task 8.3 (staging)**: Requires `STAGING_SUPABASE_DIRECT_URL`, `STAGING_VERCEL_PROJECT_ID`, `STAGING_FLY_API_TOKEN` secrets to be configured in GitHub
- **Untracked file**: `docs/DOCS_SYNC_REPORT_2026-02-03.md` — decide whether to commit or delete
- **Branch cleanup**: `feature/infra-devops-hardening` and `001-event-lifecycle-management` can be deleted
- **Change archival**: `infra-devops-hardening` is ready for `/opsx:archive` (with 8.3 deferred note)
- **Security advisory**: GO-2026-4337 in `crypto/tls@go1.25.6` — fixed in go1.25.7 when available
