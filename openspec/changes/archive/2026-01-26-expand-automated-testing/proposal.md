# Change: Expand Automated Testing

## Why

The project has solid test infrastructure (Testcontainers PostgreSQL, factory helpers, tRPC callers, CI pipeline) but shallow coverage in critical areas:

- **Router tests are happy-path only**: `event.test.ts` has 5 test cases covering 2 of 7 procedures. Status transitions, archive constraints, pagination, and error paths are untested.
- **Go scheduler is always mocked**: Both `task.test.ts` and `resource.test.ts` use `vi.mock('../services/scheduling-client')`. Zero real HTTP calls are validated, creating contract drift risk between services.
- **No systematic authorization coverage**: Each procedure tests auth individually. No matrix ensures every procedure rejects every unauthorized role.
- **No multi-step behavioral tests**: Business rules spanning multiple operations (event lifecycle state machine, task dependency chains, resource conflict escalation) have no automated validation.

## What Changes

- **Deepen router integration tests**: Add ~75 test cases across 4 router test files (event, task, resource, clients) covering business rules, edge cases, error paths, and state transitions
- **Add cross-service integration tests**: 8 scenarios making real HTTP calls to Go scheduler (built as child process with dynamic port allocation, shared Testcontainers PostgreSQL)
- **Add authorization boundary matrix**: Data-driven test (~120 cases) that maps all ~40 tRPC procedures to their expected role access and verifies rejection for every unauthorized role
- **Add business rule scenario tests**: Multi-step workflow tests validating event lifecycle, task dependency chains, resource conflict escalation, and client communication workflows

## Impact

- **Affected specs**: `integration-testing` (new capability)
- **Affected code**:
  - 4 existing router test files gain ~75 new test cases
  - 7 new test files created (auth matrix, 4 scenarios, 2 integration)
  - `vitest.config.ts` gains integration test project
  - `package.json` gains `test:integration` script
  - CI pipeline gains integration test stage (~90s additional)
- **Total new test cases**: ~226
- **Breaking changes**: None (purely additive tests)
