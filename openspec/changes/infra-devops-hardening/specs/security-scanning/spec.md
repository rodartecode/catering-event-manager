## ADDED Requirements

### Requirement: Dependabot monitors Node.js dependencies

GitHub Dependabot SHALL be configured to monitor npm/pnpm dependencies in the repository root `package.json` and all workspace packages. Dependabot SHALL check for vulnerabilities on a weekly schedule.

#### Scenario: Dependabot creates PR for vulnerable npm package

- **WHEN** a known vulnerability is published for an npm dependency
- **AND** the weekly scan runs
- **THEN** Dependabot creates a pull request to update the vulnerable package

#### Scenario: Dependabot groups minor and patch updates

- **WHEN** multiple non-security dependency updates are available
- **THEN** Dependabot groups minor and patch updates into a single pull request per ecosystem

### Requirement: Dependabot monitors Go dependencies

GitHub Dependabot SHALL be configured to monitor Go module dependencies in `apps/scheduling-service/go.mod`.

#### Scenario: Dependabot creates PR for vulnerable Go module

- **WHEN** a known vulnerability is published for a Go module dependency
- **AND** the weekly scan runs
- **THEN** Dependabot creates a pull request to update the vulnerable module

### Requirement: Dependabot limits open pull requests

Dependabot SHALL be configured to have no more than 10 open pull requests at any time per ecosystem to prevent PR noise.

#### Scenario: Dependabot respects open PR limit

- **WHEN** Dependabot already has 10 open pull requests for npm
- **AND** a new vulnerability is discovered
- **THEN** Dependabot does not create a new pull request until an existing one is closed

### Requirement: CI enforces security audit for Node.js

The CI pipeline SHALL include a `security-audit` job that runs `pnpm audit --audit-level=high` and fails the pipeline if high or critical severity vulnerabilities are found.

#### Scenario: CI passes with no high-severity vulnerabilities

- **WHEN** `pnpm audit --audit-level=high` reports zero high or critical findings
- **THEN** the security-audit job succeeds

#### Scenario: CI fails with high-severity vulnerability

- **WHEN** `pnpm audit --audit-level=high` reports one or more high or critical findings
- **THEN** the security-audit job fails
- **AND** the audit output is visible in the job logs

### Requirement: CI enforces security audit for Go

The CI pipeline SHALL include a step in the `security-audit` job that runs `govulncheck ./...` in the Go scheduling service directory and fails if vulnerabilities are found.

#### Scenario: CI passes with no Go vulnerabilities

- **WHEN** `govulncheck ./...` reports no vulnerabilities
- **THEN** the Go security audit step succeeds

#### Scenario: CI fails with Go vulnerability

- **WHEN** `govulncheck ./...` reports one or more vulnerabilities
- **THEN** the security-audit job fails
- **AND** the vulnerability details are visible in the job logs

### Requirement: Dependabot configuration file exists

A `.github/dependabot.yml` file SHALL exist in the repository with configurations for both the npm and gomod ecosystems.

#### Scenario: Dependabot config covers both ecosystems

- **WHEN** `.github/dependabot.yml` is read
- **THEN** it contains an entry for `package-ecosystem: "npm"` targeting the root directory
- **AND** it contains an entry for `package-ecosystem: "gomod"` targeting `apps/scheduling-service/`
- **AND** both entries specify a weekly schedule
