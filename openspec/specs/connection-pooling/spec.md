# connection-pooling Specification

## Purpose
TBD - created by archiving change complete-high-priority-infra. Update Purpose after archive.
## Requirements
### Requirement: TypeScript Connection Pool
The TypeScript database client SHALL be configured with connection pooling to handle CRUD operations efficiently.

#### Scenario: Pool size configuration
- **WHEN** the database client is initialized
- **THEN** the maximum pool size SHALL be 150 connections
- **AND** idle connections SHALL be closed after 30 seconds
- **AND** connection attempts SHALL timeout after 10 seconds
- **AND** connections SHALL be recycled after 30 minutes

#### Scenario: Connection reuse
- **WHEN** a database query completes
- **THEN** the connection SHALL be returned to the pool
- **AND** the connection SHALL be available for reuse

### Requirement: Go Service Connection Pool
The Go scheduling service SHALL be configured with connection pooling for conflict detection queries.

#### Scenario: Pool size configuration
- **WHEN** the database connection is established
- **THEN** the maximum open connections SHALL be 50
- **AND** the maximum idle connections SHALL be 10
- **AND** connections SHALL be recycled after 30 minutes
- **AND** idle connections SHALL be closed after 5 minutes

#### Scenario: Connection health
- **WHEN** the service starts
- **THEN** the database connection SHALL be verified with a ping
- **AND** connection failures SHALL be logged with error context

### Requirement: Total Pool Limit
The combined connection pool across all services SHALL not exceed 200 connections to prevent database resource exhaustion.

#### Scenario: Pool allocation
- **GIVEN** a maximum of 200 database connections available
- **WHEN** services are configured
- **THEN** TypeScript services SHALL use up to 150 connections (75%)
- **AND** Go services SHALL use up to 50 connections (25%)

