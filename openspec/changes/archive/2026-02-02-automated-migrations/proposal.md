## Why

Database migrations are currently applied manually via Supabase MCP tools, creating a race condition where Vercel auto-deploys new code before migrations complete. This leads to production errors when code references schema that doesn't exist yet, and manual intervention that's error-prone and doesn't scale.

## What Changes

- Disable Vercel's automatic git-triggered deployments
- Add `db:migrate` step to GitHub Actions pipeline before Vercel deploy
- Configure `SUPABASE_DIRECT_URL` secret for migration connections (port 5432, not pooled)
- Deploy via `vercel deploy --prebuilt` from GitHub Actions for sequenced control
- Update drizzle.config.ts to use migration-specific URL when available

## Capabilities

### New Capabilities

- `database-migrations`: Automated migration pipeline that runs Drizzle migrations against Supabase direct connection before deployment, with proper sequencing and failure handling.

### Modified Capabilities

- `ci-build`: Add migration step before deployment, change from Vercel auto-deploy to CLI-driven deploy.

## Impact

- **GitHub Actions**: `.github/workflows/ci.yml` - add migration job, modify deploy jobs
- **Vercel Config**: `apps/web/vercel.json` - disable auto-deploy
- **Database Config**: `packages/database/drizzle.config.ts` - support migration URL
- **Secrets Required**: `SUPABASE_DIRECT_URL` GitHub secret must be configured
- **Deployment Flow**: Changes from push-triggered to pipeline-controlled
