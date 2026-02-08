## Context

The catering event manager is deployed as a hybrid system: Next.js on Vercel, Go scheduler on Fly.io, PostgreSQL on Supabase. The CI pipeline (`.github/workflows/ci.yml`) runs lint, unit tests, Go tests, E2E tests, quality gates, build, migrations, and production deployments. PR previews exist via Vercel, but there is no persistent staging tier, no vulnerability scanning, and Docker images are built only during deployment (not stored as versioned artifacts).

**Current deployment flow**: `main` push → CI tests → migrations → deploy to Vercel + Fly.io (parallel).

**Current Dockerfiles**: Both `apps/web/Dockerfile` (3-stage Node.js) and `apps/scheduling-service/Dockerfile` (2-stage Go) exist and work. The Go service uses `fly.toml` with app name `catering-scheduler-dev`.

## Goals / Non-Goals

**Goals:**

- Add a persistent staging environment that mirrors production topology (Vercel + Fly.io + Supabase)
- Automate dependency vulnerability scanning for both Node.js/pnpm and Go ecosystems
- Publish versioned Docker images to GHCR for reproducible, rollback-capable deployments
- Maintain existing production deployment flow without disruption

**Non-Goals:**

- Blue-green or canary deployment strategies (future backlog item)
- Migrating away from Vercel/Fly.io to container-only deployment
- Application Performance Monitoring (APM) integration (separate backlog item)
- Image-based deployment replacing Vercel's native build (Vercel continues to build from source)

## Decisions

### D1: Branch strategy for staging

**Decision**: Use a `staging` branch that deploys to staging environments. Promotion to production happens by merging staging into main.

**Rationale**: The project already uses `main` for production and PR previews for dev. A dedicated branch gives a stable staging URL and clear promotion path. This is simpler than environment-based deployment flags and matches the existing branch-triggered CI pattern.

**Alternatives considered**:
- *Environment variable toggling on main*: More complex CI conditionals, harder to reason about
- *Tag-based staging*: Doesn't provide a persistent staging URL, requires manual tagging

### D2: Staging infrastructure mirrors production providers

**Decision**: Staging uses the same providers as production — Vercel (web), Fly.io (Go), Supabase (database) — with separate project/app instances.

**Rationale**: Maximizes parity between staging and production. Using different providers for staging (e.g., Docker Compose on a VM) would miss provider-specific behavior and defeat the purpose of pre-production validation.

**Infrastructure**:
| Component | Production | Staging |
|-----------|-----------|---------|
| Web | `catering-dev.vercel.app` | `catering-staging.vercel.app` |
| Go | `catering-scheduler-dev.fly.dev` | `catering-scheduler-staging.fly.dev` |
| DB | Supabase production project | Supabase staging project |

### D3: Dependabot over Snyk for security scanning

**Decision**: Use GitHub Dependabot for vulnerability scanning instead of Snyk.

**Rationale**: Dependabot is free, native to GitHub, requires zero external accounts, and handles both npm/pnpm and Go modules. It auto-creates PRs for vulnerable dependency updates. For this project's scale, Dependabot provides sufficient coverage without the complexity of Snyk's SaaS integration.

**CI enforcement**: Add a `security-audit` job that runs `pnpm audit --audit-level=high` and `govulncheck ./...` to fail the pipeline on high/critical vulnerabilities.

**Alternatives considered**:
- *Snyk*: More features (container scanning, license compliance) but requires external account and has free tier limits
- *Trivy*: Good for container scanning but overlaps with Dependabot for dependency scanning; can be added later for image scanning

### D4: GHCR with SHA + latest tagging

**Decision**: Publish Docker images to GitHub Container Registry (GHCR) tagged with `sha-<short-sha>` and `latest` on every main branch push.

**Rationale**: GHCR is free for public repos and included in GitHub Actions minutes for private repos. The `GITHUB_TOKEN` provides authentication without additional secrets. SHA tagging enables exact version pinning and rollback; `latest` provides a convenience tag.

**Image naming**:
- `ghcr.io/<owner>/catering-web:sha-abc1234`
- `ghcr.io/<owner>/catering-web:latest`
- `ghcr.io/<owner>/catering-scheduler:sha-abc1234`
- `ghcr.io/<owner>/catering-scheduler:latest`

**Alternatives considered**:
- *Docker Hub*: Rate limits on pulls, requires separate credentials
- *AWS ECR*: Overkill for this project, requires AWS account

### D5: Separate CI workflow for image publishing

**Decision**: Add GHCR publishing as a new job in the existing `ci.yml` workflow, triggered only on main branch push, after build succeeds.

**Rationale**: Keeps everything in one workflow file for simplicity. The job uses `docker/build-push-action` with QEMU for multi-platform builds (linux/amd64). It depends on the existing `build` job to avoid publishing broken images.

**Alternative considered**:
- *Separate workflow file*: More files to maintain, harder to see the full pipeline at a glance

### D6: Staging Fly.io app uses separate fly.toml

**Decision**: Create `apps/scheduling-service/fly.staging.toml` for the staging Fly.io app, deployed with `flyctl deploy --config fly.staging.toml`.

**Rationale**: Fly.io deployment is tied to the `fly.toml` app name. A separate config file cleanly separates staging from production without environment variable gymnastics. The CI pipeline selects the config based on the target branch.

## Risks / Trade-offs

**[Cost]** → Staging Supabase project incurs an additional database cost. Mitigation: Use Supabase free tier for staging; the staging database only needs to handle manual testing, not production load.

**[Drift]** → Staging and production environments can drift if one is updated without the other. Mitigation: Both are deployed from the same CI pipeline with the same Dockerfiles/configs; only the target differs by branch.

**[Secret management]** → 3 new GitHub secrets needed for staging. Mitigation: Document all required secrets in `ENV.md` and CI setup guide; use GitHub Environments to scope secrets.

**[Dependabot PR noise]** → Dependabot may create many PRs for transitive dependency updates. Mitigation: Configure `dependabot.yml` with grouped updates and limit open PRs to 10. Set schedule to weekly rather than daily.

**[GHCR storage]** → Untagged/old images accumulate over time. Mitigation: Add a cleanup workflow that deletes images older than 30 days (except tagged releases). Can be added as a follow-up.

## Migration Plan

1. **Create staging infrastructure** (manual, one-time):
   - Create Supabase staging project and note the connection strings
   - Create Fly.io staging app (`catering-scheduler-staging`)
   - Create Vercel staging project linked to `staging` branch
   - Add all staging secrets to GitHub repository settings

2. **Add Dependabot config** (PR to main):
   - Create `.github/dependabot.yml`
   - Merge to main; Dependabot begins scanning immediately

3. **Update CI workflow** (PR to main):
   - Add `security-audit` job
   - Add `publish-images` job for GHCR
   - Add staging deployment jobs (triggered by `staging` branch)
   - Add `fly.staging.toml`

4. **Create staging branch** (after CI changes merge):
   - Branch `staging` from `main`
   - Push to trigger first staging deployment
   - Verify all three staging services are healthy

5. **Rollback**: All changes are additive to CI. Removing a job or reverting the workflow restores previous behavior. Production deployment flow is unchanged throughout.

## Open Questions

- **Supabase free tier limits**: Confirm the free tier supports a second project for staging, or if a paid plan is needed.
- **GHCR visibility**: Should images be public (free unlimited storage) or private (counts against GitHub storage quota)?
- **Staging data seeding**: Should the staging database be seeded with demo data automatically, or left empty for manual testing?
