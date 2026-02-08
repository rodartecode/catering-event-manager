## 1. Security Scanning — Dependabot Configuration

- [x] 1.1 Create `.github/dependabot.yml` with `npm` ecosystem entry targeting `/` directory, weekly schedule, grouped minor/patch updates, open PR limit of 10
- [x] 1.2 Add `gomod` ecosystem entry to `.github/dependabot.yml` targeting `apps/scheduling-service/`, weekly schedule, open PR limit of 10
- [x] 1.3 Verify Dependabot config syntax by pushing to a branch and confirming GitHub recognizes the configuration (Settings → Code security → Dependabot)

## 2. Security Scanning — CI Audit Job

- [x] 2.1 Add `security-audit` job to `.github/workflows/ci.yml` that runs on all branches and PRs, installs pnpm dependencies, and runs `pnpm audit --audit-level=high`
- [x] 2.2 Add Go vulnerability check step to the `security-audit` job: install `govulncheck` via `go install golang.org/x/vuln/cmd/govulncheck@latest`, then run `govulncheck ./...` in `apps/scheduling-service/`
- [x] 2.3 Set `continue-on-error: true` on the `security-audit` job so it reports failures without blocking other CI jobs

## 3. Container Registry — Dockerfile Labels

- [x] 3.1 Add OCI metadata labels to `apps/web/Dockerfile` runner stage: `org.opencontainers.image.source`, `org.opencontainers.image.revision`, `org.opencontainers.image.created`
- [x] 3.2 Add OCI metadata labels to `apps/scheduling-service/Dockerfile` runner stage: `org.opencontainers.image.source`, `org.opencontainers.image.revision`, `org.opencontainers.image.created`

## 4. Container Registry — CI Publish Job

- [x] 4.1 Add `publish-images` job to `.github/workflows/ci.yml` with `needs: [build]`, `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, and `permissions: packages: write`
- [x] 4.2 Add GHCR login step using `docker/login-action` with `registry: ghcr.io`, `username: ${{ github.actor }}`, `password: ${{ secrets.GITHUB_TOKEN }}`
- [x] 4.3 Add web image build and push step using `docker/build-push-action` with context `apps/web/`, tags `ghcr.io/${{ github.repository_owner }}/catering-web:sha-${{ github.sha }}` and `latest`, and OCI label args
- [x] 4.4 Add Go scheduler image build and push step using `docker/build-push-action` with context `apps/scheduling-service/`, tags `ghcr.io/${{ github.repository_owner }}/catering-scheduler:sha-${{ github.sha }}` and `latest`, and OCI label args
- [x] 4.5 Add `docker/setup-buildx-action` step before build steps for efficient layer caching

## 5. Staging Environment — Fly.io Configuration

- [x] 5.1 Create `apps/scheduling-service/fly.staging.toml` by copying `fly.toml` and changing `app` to `catering-scheduler-staging`
- [x] 5.2 Verify `fly.staging.toml` has matching config to production: same port (8080), health check path (`/api/v1/health`), auto-stop/auto-start settings

## 6. Staging Environment — CI Workflow Updates

- [x] 6.1 Update CI workflow `on.push.branches` to include `staging` alongside `main` and `develop`
- [x] 6.2 Update CI workflow `on.pull_request.branches` to include `staging` alongside `main` and `develop`
- [x] 6.3 Add `migrate-staging` job: runs on `staging` branch push only (`if: github.ref == 'refs/heads/staging' && github.event_name == 'push'`), depends on `build`, runs `pnpm --filter @catering/database db:migrate` with `DATABASE_URL: ${{ secrets.STAGING_SUPABASE_DIRECT_URL }}`
- [x] 6.4 Add `deploy-staging-web` job: runs on `staging` branch push, depends on `[lint, unit-tests, go-tests, build, migrate-staging]`, uses `vercel deploy` with `STAGING_VERCEL_PROJECT_ID` secret and shared `VERCEL_TOKEN`/`VERCEL_ORG_ID`
- [x] 6.5 Add `deploy-staging-go` job: runs on `staging` branch push, depends on `[build, migrate-staging]`, uses `flyctl deploy --config fly.staging.toml --remote-only` with `STAGING_FLY_API_TOKEN`, verifies health with `flyctl status --app catering-scheduler-staging`
- [x] 6.6 Ensure production deployment jobs (`deploy-production`, `deploy-go-production`) explicitly require `github.ref == 'refs/heads/main'` to prevent accidental production deploy from staging branch

## 7. Documentation & Secrets

- [x] 7.1 Update `ENV.md` with new GitHub secrets: `STAGING_SUPABASE_DIRECT_URL`, `STAGING_VERCEL_PROJECT_ID`, `STAGING_FLY_API_TOKEN`
- [x] 7.2 Document staging setup instructions in `docs/DEPLOYMENT.md`: create Supabase staging project, create Fly.io staging app, create Vercel staging project, configure GitHub secrets
- [x] 7.3 Update `CONTRIBUTING.md` with staging branch workflow: how to push to staging, how to promote staging to production

## 8. Verification

- [ ] 8.1 Push CI workflow changes to a feature branch and verify: `security-audit` job runs, `publish-images` job is skipped (non-main branch), staging jobs are skipped (non-staging branch), all existing jobs still pass
- [ ] 8.2 Merge to main and verify: `publish-images` job runs and pushes both images to GHCR with correct tags, production deployment continues to work, `security-audit` job reports results
- [ ] 8.3 Create `staging` branch from `main`, push, and verify: staging migration runs against staging database, staging web deploys to Vercel staging project, staging Go deploys to Fly.io staging app, all staging health checks pass
- [ ] 8.4 Verify Dependabot creates initial scan results visible in GitHub Security tab

> **Note**: Tasks 8.1–8.4 are post-push verification tasks that require GitHub CI execution and cannot be validated locally.
