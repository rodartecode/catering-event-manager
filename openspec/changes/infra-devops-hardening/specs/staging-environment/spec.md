## ADDED Requirements

### Requirement: Staging branch triggers staging deployment

The CI pipeline SHALL deploy to staging environments when code is pushed to the `staging` branch. Staging deployments SHALL NOT trigger on pushes to `main` or on pull requests.

#### Scenario: Staging deploy on staging branch push

- **WHEN** a commit is pushed to the `staging` branch
- **AND** all lint, test, and build jobs pass
- **THEN** the web app deploys to the Vercel staging project
- **AND** the Go scheduler deploys to the Fly.io staging app
- **AND** database migrations run against the staging Supabase database

#### Scenario: Staging deploy skipped on main push

- **WHEN** a commit is pushed to the `main` branch
- **THEN** staging deployment jobs do not run

#### Scenario: Staging deploy skipped on pull request

- **WHEN** a pull request is opened or updated
- **THEN** staging deployment jobs do not run

### Requirement: Staging web app deploys to dedicated Vercel project

The CI pipeline SHALL deploy the Next.js web app to a separate Vercel project for staging, producing a stable staging URL distinct from the production deployment.

#### Scenario: Staging web deployment uses staging secrets

- **WHEN** the staging web deployment job runs
- **THEN** it uses `STAGING_VERCEL_PROJECT_ID` secret
- **AND** it uses the shared `VERCEL_TOKEN` and `VERCEL_ORG_ID` secrets
- **AND** the deployment is available at the staging Vercel URL

#### Scenario: Staging web deployment fails without staging secrets

- **WHEN** `STAGING_VERCEL_PROJECT_ID` secret is not configured
- **THEN** the staging web deployment job fails with a clear error

### Requirement: Staging Go service deploys to dedicated Fly.io app

The CI pipeline SHALL deploy the Go scheduling service to a separate Fly.io app for staging, using a dedicated `fly.staging.toml` configuration file.

#### Scenario: Staging Go deployment uses staging config

- **WHEN** the staging Go deployment job runs
- **THEN** it uses `fly.staging.toml` from `apps/scheduling-service/`
- **AND** it uses `STAGING_FLY_API_TOKEN` secret for authentication
- **AND** the deployment is available at the staging Fly.io URL

#### Scenario: Staging Go deployment verifies health

- **WHEN** staging Go deployment completes
- **THEN** the job verifies the health check at `/api/v1/health` on the staging app
- **AND** the job succeeds only if the health check passes

### Requirement: Staging database migrations run against staging database

The CI pipeline SHALL run database migrations against the staging Supabase database on `staging` branch pushes, using a dedicated staging connection string.

#### Scenario: Staging migrations use staging database URL

- **WHEN** the staging migration job runs
- **THEN** it uses the `STAGING_SUPABASE_DIRECT_URL` secret
- **AND** it does NOT use the production `SUPABASE_DIRECT_URL` secret

#### Scenario: Staging deployments wait for staging migrations

- **WHEN** staging migration job has not completed
- **THEN** staging deployment jobs for web and Go do not start

### Requirement: Staging fly.toml configuration exists

A `fly.staging.toml` file SHALL exist at `apps/scheduling-service/fly.staging.toml` with the staging Fly.io app name and equivalent configuration to the production `fly.toml`.

#### Scenario: Staging fly config specifies staging app

- **WHEN** `fly.staging.toml` is read
- **THEN** the `app` field contains the staging app name (not the production app name)
- **AND** all other configuration (port, health checks, auto-stop) matches production `fly.toml`
