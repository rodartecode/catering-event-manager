# ADR-0002: Expanded Automated Testing Strategy

**Date**: 2026-01-25
**Status**: Accepted

## Context

The codebase had basic happy-path tests for tRPC routers but lacked systematic coverage of authorization boundaries, business rule edge cases, and cross-service integration. Specific gaps:

- No verification that all 49 tRPC procedures enforce correct role-based access
- Router tests covered only create/list happy paths, missing status transitions, archive constraints, cursor pagination, and error paths
- No scenario-level tests for multi-step business workflows (event lifecycle, task dependency chains, resource conflicts)
- No integration tests verifying the real Go scheduling service communicates correctly with tRPC routers

## Decision

Implement a 5-phase testing expansion:

### 1. Data-Driven Authorization Boundary Matrix

A single `test/auth-matrix.test.ts` file uses `it.each` to generate ~97 test cases from a procedure registry. Each tRPC procedure is annotated with its access level (admin, protected, client, public), and the matrix tests every unauthorized role against every procedure.

**Why data-driven**: Adding a new tRPC procedure requires only adding one entry to `allProcedures` in `input-factories.ts`. The matrix automatically generates the correct rejection tests. This prevents the common failure mode of adding a procedure but forgetting to test its authorization.

**Why a single file**: Authorization is a cross-cutting concern. Testing it per-router would scatter related assertions across many files and make gaps harder to spot.

### 2. Deepened Router Tests

Existing router test files were extended with edge case coverage: invalid state transitions, archived event constraints, cursor pagination, NOT_FOUND errors, partial updates, and filter combinations. These remain co-located with their router source files.

### 3. Business Rule Scenario Tests

New `test/scenarios/` directory contains multi-step behavioral tests that verify complete business workflows:

- **Event lifecycle**: Full state machine traversal (inquiry → archive), frozen invariant enforcement
- **Task dependencies**: Chain enforcement, circular prevention, deletion cascade
- **Resource conflicts**: Scheduling client integration (mocked), force override behavior
- **Client communication**: Follow-up lifecycle, overdue calculation accuracy

**Why separate from router tests**: Scenario tests cross multiple routers and test emergent behavior from their interaction. Mixing them into individual router test files would obscure their cross-cutting nature.

### 4. Cross-Service Integration Tests

`test/integration/` contains tests that build and spawn the real Go scheduling service as a child process against a shared Testcontainers PostgreSQL instance. No mocks.

**Why child process (not Docker)**: The Go service is a single binary. Building and spawning it directly is faster than building a Docker image, avoids Docker-in-Docker complexity in CI, and provides direct stdout/stderr access for debugging. The test infrastructure handles dynamic port allocation, health check polling, and graceful shutdown.

**Why separate Vitest config**: Integration tests require the `node` environment (not `jsdom`), longer timeouts (60s), and a Go toolchain. Running them separately prevents slow CI feedback for unit tests.

### 5. Shared Test Infrastructure

`test/helpers/` provides reusable foundations:

- `db.ts`: Testcontainers PostgreSQL lifecycle (setup, clean, teardown)
- `trpc.ts`: Caller factories for all 4 roles (admin, manager, client, unauthenticated)
- `factories.ts`: Data factories for all domain entities
- `input-factories.ts`: Auth matrix data setup and procedure input generators

## Consequences

### Positive

- **559 tests** (up from ~280), 2 skipped, 0 failures
- Authorization coverage: every procedure verified against every unauthorized role
- Adding new tRPC procedures automatically generates auth matrix test cases
- Business rule regressions caught by scenario tests that mirror real user workflows
- Cross-service integration verified without mocks

### Negative

- Test suite runtime increased (~110s for unit/scenario tests, additional time for integration)
- `fileParallelism: false` required due to shared Testcontainers database
- Cross-service tests require Go 1.24+ toolchain in CI
- Event list cursor pagination has a known limitation (ID-based cursor with date ordering) documented in tests but not yet fixed

### Trade-offs

- **Testcontainers vs in-memory DB**: Chose real PostgreSQL for accuracy over speed. Schema features (enums, GiST indexes, triggers) don't work in SQLite.
- **Child process vs HTTP mocks for Go service**: Integration tests use the real binary for confidence. Unit/scenario tests mock the scheduling client for speed and isolation.
- **Data-driven matrix vs individual auth tests**: Matrix is less readable per-case but guarantees no gaps. Individual tests would be clearer but risk incomplete coverage.
