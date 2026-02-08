## ADDED Requirements

### Requirement: Go service deploys to staging on staging branch push

The CI pipeline SHALL deploy the Go scheduling service to the staging Fly.io app when code is pushed to the `staging` branch, using `fly.staging.toml` configuration.

#### Scenario: Staging deployment on staging push

- **WHEN** a commit is pushed to the `staging` branch
- **AND** all build and test jobs pass
- **AND** staging database migrations complete successfully
- **THEN** the Go service is deployed to the staging Fly.io app using `fly.staging.toml`

#### Scenario: Staging deployment skipped on main push

- **WHEN** a commit is pushed to the `main` branch
- **THEN** the staging Go deployment job does not run

### Requirement: Staging deployment uses separate authentication

The staging Go deployment job SHALL use the `STAGING_FLY_API_TOKEN` secret, separate from the production `FLY_API_TOKEN`.

#### Scenario: Staging deployment authenticates with staging token

- **WHEN** the staging Go deployment job runs
- **THEN** it authenticates with Fly.io using `STAGING_FLY_API_TOKEN`
- **AND** it does NOT use the production `FLY_API_TOKEN`

#### Scenario: Staging deployment fails without staging token

- **WHEN** `STAGING_FLY_API_TOKEN` secret is missing or invalid
- **THEN** the staging Go deployment job fails with authentication error

### Requirement: Staging deployment verifies health

The staging Go deployment job SHALL verify the deployed staging service is healthy before marking the job as successful.

#### Scenario: Staging health verification passes

- **WHEN** staging deployment completes
- **AND** the health check at `/api/v1/health` on the staging app passes
- **THEN** the staging deployment job succeeds

#### Scenario: Staging health verification fails

- **WHEN** staging deployment completes
- **AND** the health check at `/api/v1/health` on the staging app fails within the grace period
- **THEN** the staging deployment job fails

## MODIFIED Requirements

### Requirement: Go service deploys automatically on main branch push

The CI pipeline SHALL deploy the Go scheduling service to Fly.io automatically when code is pushed to the `main` branch.

#### Scenario: Successful deployment on main push

- **WHEN** a commit is pushed to the `main` branch
- **AND** all build and test jobs pass
- **AND** database migrations complete successfully
- **THEN** the Go service is deployed to Fly.io using `fly.toml` (production config)

#### Scenario: Deployment skipped on pull request

- **WHEN** a pull request is opened or updated
- **THEN** the Go deployment job does not run

#### Scenario: Deployment skipped on staging push

- **WHEN** a commit is pushed to the `staging` branch
- **THEN** the production Go deployment job does not run

### Requirement: Go and Vercel deployments run in parallel

The Go deployment and Vercel deployment jobs SHALL run in parallel after their respective dependencies complete, to minimize total pipeline time. This applies to both production and staging deployment tiers.

#### Scenario: Parallel production deployment execution

- **WHEN** production migrations complete
- **THEN** both `deploy-go-production` and `deploy-production` jobs start simultaneously

#### Scenario: Parallel staging deployment execution

- **WHEN** staging migrations complete
- **THEN** both staging web and staging Go deployment jobs start simultaneously
