# CI Build Capability

## Requirements

### Requirement: Health route supports build without database

The `/api/health` route SHALL be marked as dynamic to prevent Next.js from evaluating it during build time. This ensures the CI Build job can complete without requiring a DATABASE_URL environment variable or PostgreSQL service.

#### Scenario: Build succeeds without DATABASE_URL

- **WHEN** `next build` runs without DATABASE_URL set
- **THEN** build completes successfully without database connection errors

#### Scenario: Health route works at runtime

- **WHEN** a GET request is made to `/api/health` with DATABASE_URL configured
- **THEN** route returns database connectivity status as before
