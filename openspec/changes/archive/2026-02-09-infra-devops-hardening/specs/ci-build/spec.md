## ADDED Requirements

### Requirement: CI workflow triggers on staging branch

The CI workflow SHALL trigger on pushes to the `staging` branch in addition to `main` and `develop`, and on pull requests targeting `staging`.

#### Scenario: CI runs on staging branch push

- **WHEN** a commit is pushed to the `staging` branch
- **THEN** all lint, test, and build jobs run

#### Scenario: CI runs on PR targeting staging

- **WHEN** a pull request is opened targeting the `staging` branch
- **THEN** all lint, test, and build jobs run

### Requirement: Security audit job runs in CI pipeline

The CI workflow SHALL include a `security-audit` job that checks for dependency vulnerabilities in both Node.js and Go ecosystems. This job SHALL run on all branches and pull requests.

#### Scenario: Security audit runs on every CI trigger

- **WHEN** the CI workflow is triggered (push or pull request)
- **THEN** the `security-audit` job runs
- **AND** it executes `pnpm audit --audit-level=high` for Node.js dependencies
- **AND** it executes `govulncheck ./...` for Go dependencies

#### Scenario: Security audit failure does not block other jobs

- **WHEN** the `security-audit` job fails
- **THEN** lint, test, build, and deployment jobs continue independently
- **AND** the security audit failure is visible in the CI status

### Requirement: Image publishing job exists in CI workflow

The CI workflow SHALL include a `publish-images` job that builds and pushes Docker images to GHCR. This job SHALL depend on the `build` job and only run on `main` branch pushes.

#### Scenario: Publish images job appears in CI workflow

- **WHEN** a push to `main` triggers the CI workflow
- **AND** the build job succeeds
- **THEN** the `publish-images` job runs and publishes both web and Go images

#### Scenario: Publish images job skipped on non-main branches

- **WHEN** a push to `staging` or `develop` triggers the CI workflow
- **THEN** the `publish-images` job does not run

## MODIFIED Requirements

### Requirement: Health route supports build without database

The `/api/health` route SHALL be marked as dynamic to prevent Next.js from evaluating it during build time. This ensures the CI Build job can complete without requiring a DATABASE_URL environment variable or PostgreSQL service.

#### Scenario: Build succeeds without DATABASE_URL

- **WHEN** `next build` runs without DATABASE_URL set
- **THEN** build completes successfully without database connection errors

#### Scenario: Health route works at runtime

- **WHEN** a GET request is made to `/api/health` with DATABASE_URL configured
- **THEN** route returns database connectivity status as before

#### Scenario: Build succeeds on staging branch without DATABASE_URL

- **WHEN** `next build` runs on the `staging` branch without DATABASE_URL set
- **THEN** build completes successfully without database connection errors
