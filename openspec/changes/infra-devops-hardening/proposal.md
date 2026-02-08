## Why

The production system is live (Vercel + Fly.io + Supabase) but lacks critical DevOps maturity: there is no dedicated staging environment for pre-production validation, no automated dependency vulnerability scanning, and Docker images are built ad-hoc without versioned artifacts in a container registry. This increases the risk of deploying untested changes to production, shipping vulnerable dependencies, and lacking reproducible, rollback-capable deployments.

## What Changes

- **Staging environment**: Add a `staging` branch and dedicated Vercel deployment with its own Supabase database, plus a staging Fly.io app for the Go scheduler. PR previews already exist; this adds a persistent staging tier between previews and production.
- **Security scanning**: Integrate GitHub Dependabot for automated dependency vulnerability alerts and PRs across both the Node.js/pnpm and Go ecosystems. Add a CI job that fails on high/critical vulnerabilities.
- **Container registry**: Publish versioned Docker images for both `apps/web` and `apps/scheduling-service` to GitHub Container Registry (GHCR) on every main branch push, tagged with git SHA and `latest`. Enables rollback-by-tag and consistent deployment artifacts.

## Capabilities

### New Capabilities

- `staging-environment`: Dedicated staging deployment tier (Vercel + Fly.io + Supabase) with branch-based promotion workflow from staging to production.
- `security-scanning`: Automated dependency vulnerability scanning via Dependabot with CI enforcement for high/critical severity findings.
- `container-registry`: Docker image publishing to GHCR with semantic tagging (SHA, latest) for both web and Go service images.

### Modified Capabilities

- `ci-build`: CI workflow gains new jobs for security scanning gate and GHCR image publishing; staging deployment job added alongside existing preview and production jobs.
- `go-ci-deployment`: Go deployment workflow extended with staging environment target and image-based deployment option.

## Impact

- **CI/CD**: `.github/workflows/ci.yml` gains 3-4 new jobs (staging deploy, security scan, image publish). New `dependabot.yml` configuration file.
- **Infrastructure**: New Supabase project for staging database, new Fly.io app for staging Go service, GHCR repository setup.
- **Secrets**: New GitHub secrets needed: `STAGING_SUPABASE_DIRECT_URL`, `STAGING_VERCEL_PROJECT_ID`, `STAGING_FLY_API_TOKEN`, plus GHCR uses the default `GITHUB_TOKEN`.
- **Dockerfiles**: Existing `apps/web/Dockerfile` and `apps/scheduling-service/Dockerfile` may need minor label/metadata additions for GHCR publishing.
- **Branch strategy**: `staging` branch becomes a protected branch with its own deployment pipeline.
- **No breaking changes** to existing production deployment flow.
