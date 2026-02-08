## Why

The Go scheduling service currently requires manual deployment via `flyctl deploy` while the Next.js app deploys automatically through CI. This creates deployment friction, increases risk of version drift between services, and requires developer intervention for every release.

## What Changes

- Add automated Fly.io deployment to the CI pipeline for the Go scheduling service
- Deploy Go service automatically on pushes to `main` (after migrations and before/in parallel with Vercel)
- Add deployment status checks and health verification
- Configure Fly.io secrets management via GitHub Secrets

## Capabilities

### New Capabilities

- `go-ci-deployment`: Automated deployment of the Go scheduling service to Fly.io via GitHub Actions, including build, deploy, and health check verification

### Modified Capabilities

- `ci-build`: Add Fly.io deployment job to existing CI workflow, update job dependencies to ensure proper ordering (migrations → Go deploy + Vercel deploy)

## Impact

**Files Modified:**
- `.github/workflows/ci.yml` - Add `deploy-go-production` job

**Secrets Required:**
- `FLY_API_TOKEN` - Fly.io API token for deployment authentication

**Dependencies:**
- Fly.io CLI (`flyctl`) in GitHub Actions runner
- Existing `fly.toml` and `Dockerfile` (already present)

**Deployment Order:**
1. Build & test (existing)
2. Database migrations (existing)
3. Go service deployment (new) + Vercel deployment (existing) - can run in parallel
