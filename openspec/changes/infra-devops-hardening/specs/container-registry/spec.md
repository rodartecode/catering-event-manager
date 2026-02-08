## ADDED Requirements

### Requirement: Web app Docker image published to GHCR on main push

The CI pipeline SHALL build and publish the Next.js web app Docker image to GitHub Container Registry on every push to the `main` branch, after the build job succeeds.

#### Scenario: Web image published on main push

- **WHEN** a commit is pushed to the `main` branch
- **AND** the build job completes successfully
- **THEN** the web app Docker image is pushed to `ghcr.io/<owner>/catering-web`
- **AND** the image is tagged with `sha-<short-git-sha>`
- **AND** the image is tagged with `latest`

#### Scenario: Web image not published on pull request

- **WHEN** a pull request is opened or updated
- **THEN** the image publishing job does not run

### Requirement: Go scheduler Docker image published to GHCR on main push

The CI pipeline SHALL build and publish the Go scheduling service Docker image to GitHub Container Registry on every push to the `main` branch, after the build job succeeds.

#### Scenario: Go image published on main push

- **WHEN** a commit is pushed to the `main` branch
- **AND** the build job completes successfully
- **THEN** the Go scheduler Docker image is pushed to `ghcr.io/<owner>/catering-scheduler`
- **AND** the image is tagged with `sha-<short-git-sha>`
- **AND** the image is tagged with `latest`

#### Scenario: Go image not published on pull request

- **WHEN** a pull request is opened or updated
- **THEN** the image publishing job does not run

### Requirement: Image publishing authenticates with GITHUB_TOKEN

The image publishing job SHALL authenticate with GHCR using the default `GITHUB_TOKEN` provided by GitHub Actions, requiring no additional secrets.

#### Scenario: GHCR authentication succeeds

- **WHEN** the image publishing job runs
- **THEN** it authenticates with GHCR using `GITHUB_TOKEN`
- **AND** no additional container registry secrets are required

### Requirement: Images include OCI metadata labels

Published Docker images SHALL include standard OCI metadata labels for traceability, including source repository URL, commit SHA, and build timestamp.

#### Scenario: Published image contains metadata labels

- **WHEN** a Docker image is published to GHCR
- **THEN** the image includes an `org.opencontainers.image.source` label pointing to the repository URL
- **AND** the image includes an `org.opencontainers.image.revision` label with the full commit SHA

### Requirement: Image publishing depends on build success

The image publishing job SHALL NOT run unless the existing `build` job completes successfully, preventing publication of images from broken builds.

#### Scenario: Image publishing blocked by build failure

- **WHEN** the build job fails
- **THEN** the image publishing job does not start

#### Scenario: Image publishing proceeds after build success

- **WHEN** the build job completes successfully
- **AND** the push is to the `main` branch
- **THEN** the image publishing job starts
