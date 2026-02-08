## Context

The Go scheduling service (`apps/scheduling-service`) is production-ready with:
- Dockerfile configured for multi-stage builds (golang:1.24-alpine → alpine)
- `fly.toml` configured for `catering-scheduler-dev` app in `ord` region
- Health check endpoint at `/api/v1/health`
- Auto-scaling (0 to N machines) enabled

Current CI workflow (`ci.yml`) includes:
- Go build and test jobs
- Database migration job (runs on main branch push)
- Vercel deployment for Next.js app
- **Missing**: Automated Fly.io deployment

## Goals / Non-Goals

**Goals:**
- Automate Go service deployment on every push to `main`
- Ensure deployment runs after migrations complete
- Verify deployment health before marking success
- Keep deployment fast (< 3 minutes)

**Non-Goals:**
- Preview deployments for PRs (Fly.io costs; Go service rarely changes independently)
- Blue-green or canary deployments (scope for later)
- Container registry publishing (separate backlog item)

## Decisions

### 1. Use Official Fly.io GitHub Action

**Decision**: Use `superfly/flyctl-actions/setup-flyctl@master` + `flyctl deploy`

**Rationale**:
- Official action, well-maintained
- Handles Fly CLI installation and authentication
- Simpler than building/pushing Docker images separately

**Alternatives Considered**:
| Option | Pros | Cons |
|--------|------|------|
| Direct flyctl install | More control | More YAML, version management |
| Docker Hub + fly deploy image | Reusable images | Extra registry, slower |
| **Official action** | Simple, maintained | Tied to action versioning |

### 2. Deploy After Migrations, Parallel with Vercel

**Decision**: Add `deploy-go-production` job with `needs: [build, migrate]`

**Rationale**:
- Go service depends on database schema (must wait for migrations)
- Go and Vercel deployments are independent (can run in parallel)
- Reduces total pipeline time vs sequential deployment

**Job Dependency Graph**:
```
build ─────┬─→ migrate ─┬─→ deploy-go-production
           │            └─→ deploy-production (Vercel)
           └─→ deploy-preview (PRs only)
```

### 3. Health Check Verification

**Decision**: Use `flyctl status` after deploy to verify machine health

**Rationale**:
- fly.toml already configures health checks at `/api/v1/health`
- Fly.io won't route traffic until health check passes
- `flyctl status` confirms machines are running

### 4. Secrets Management

**Decision**: Store `FLY_API_TOKEN` in GitHub Secrets

**Rationale**:
- Standard pattern for GitHub Actions + Fly.io
- Token scoped to organization or specific app
- No secrets in code or fly.toml

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Deploy fails but Vercel succeeds (version mismatch) | Jobs are independent; manual rollback if needed. Future: add deployment coordination. |
| Fly.io rate limits | Unlikely with single deploy per push; monitor if issues arise |
| Long deploy times slow CI | Fly builds are cached; typically < 2 minutes |
| Token compromise | Use minimal-scope token; rotate periodically |

## Migration Plan

**Deployment Steps**:
1. Create Fly.io API token with deploy permissions
2. Add `FLY_API_TOKEN` to GitHub repository secrets
3. Update `ci.yml` with new deployment job
4. Merge to main → automatic deployment begins

**Rollback Strategy**:
- `flyctl releases list -a catering-scheduler-dev` to see history
- `flyctl deploy --image <previous-image>` to rollback
- Or: revert Git commit and redeploy

## Open Questions

None - this is a straightforward CI addition using established patterns.
