## Context

Currently, database migrations are applied manually using Supabase MCP tools after code is pushed. Vercel auto-deploys on git push, creating a race condition where new code may deploy before migrations complete.

**Current Flow:**
```
git push main
    │
    ├──→ Vercel auto-deploys (immediate)
    │
    └──→ Developer runs Supabase MCP manually (delayed)
         → Risk: New code references non-existent schema
```

**Constraints:**
- Supabase pooled connections (port 6543) don't support DDL/migrations
- Direct connection (port 5432) required for Drizzle migrations
- Single-developer project, no concurrent deployments expected

## Goals / Non-Goals

**Goals:**
- Migrations run automatically before every production deployment
- Eliminate manual Supabase MCP work for schema changes
- Pipeline fails fast if migration fails (no partial deploys)
- Clear audit trail of migration runs in CI logs

**Non-Goals:**
- Advisory locking for concurrent migrations (single developer, overkill)
- Automated rollbacks (Drizzle doesn't support, use forward-only)
- Preview environment database branching (future consideration)
- Migration testing against production data copy (manual when needed)

## Decisions

### 1. Disable Vercel Auto-Deploy

**Decision:** Add `"git": { "deploymentEnabled": false }` to `apps/web/vercel.json`

**Rationale:** Vercel and GitHub Actions both trigger on git push, creating a race. By disabling auto-deploy, we gain full control over deployment sequencing.

**Alternatives Considered:**
- Keep auto-deploy + use Vercel build hooks → Still races, more complex
- Use Vercel ignored build step → Only delays, doesn't sequence migrations

### 2. Use Vercel CLI from GitHub Actions

**Decision:** Deploy via `vercel deploy --prebuilt --prod` after migrations complete.

**Rationale:** The `--prebuilt` flag uses artifacts from the build step, ensuring we deploy the exact code that passed tests. CLI deployment happens only after migration step succeeds.

**Alternatives Considered:**
- Use `amondnet/vercel-action` with migration step before → Action doesn't support `--prebuilt`
- Build in deploy step → Duplicates build work, slower

### 3. Separate Migration URL

**Decision:** Use `SUPABASE_DIRECT_URL` (port 5432) for migrations, keep `DATABASE_URL` for runtime.

**Rationale:** Supabase transaction pooler (port 6543) operates in transaction mode, breaking advisory locks and DDL. Direct connection required for migrations. Keep runtime using pooled for serverless scaling.

**Configuration:**
```typescript
// drizzle.config.ts
url: process.env.SUPABASE_DIRECT_URL || process.env.DATABASE_URL
```

### 4. Migration Step Placement

**Decision:** Add dedicated `migrate` job that runs after `build` and before `deploy-production`.

**Rationale:**
- After build: Ensures code is valid before touching database
- Before deploy: Ensures schema exists for new code
- Separate job: Clear failure attribution in CI logs

**Pipeline Order:**
```
lint → unit-tests → go-tests → build → migrate → deploy-production
                                  ↓
                            (on failure, deploy is skipped)
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Migration fails mid-deploy → stuck state | Drizzle runs in transaction, auto-rollback. Fix and re-push. |
| Direct URL exposed in logs | Use GitHub secret, never echo in commands |
| Longer deploy time (+migration step) | Migrations typically <10s. Acceptable for safety. |
| Preview deploys lack migrations | Acceptable for now. Add preview DB branching later if needed. |

## Migration Plan

**Deployment Steps:**
1. Add `SUPABASE_DIRECT_URL` to GitHub repository secrets
2. Commit vercel.json change (disables auto-deploy immediately)
3. Commit CI workflow changes
4. Commit drizzle.config.ts changes
5. Push all changes → First deployment uses new pipeline

**Rollback Strategy:**
- Remove `git.deploymentEnabled: false` from vercel.json to restore auto-deploy
- Re-enable manual Supabase MCP workflow
- No database rollback needed (config-only change)

## Open Questions

None - scope is well-defined and all decisions made.
