# Spec Delta: e2e-testing

## MODIFIED Requirements

### Requirement: Documented Remaining Skips

Each skipped E2E test SHALL have a documented reason in both the test file (via `test.skip` annotation) and in this specification. The following tests remain legitimately skipped (~4 tests):

| Test | File | Reason |
|------|------|--------|
| Detect resource scheduling conflict | resource-scheduling.e2e.ts | On-demand compilation of `/resources/[id]` in dev mode causes race condition |
| View resource schedule calendar | resource-scheduling.e2e.ts | On-demand compilation of `/resources/[id]` in dev mode causes race condition |
| View conflict warning before assignment | resource-scheduling.e2e.ts | Requires creating overlapping schedule entries in test setup |
| Complete follow-up | client-communication.e2e.ts | Requires seeding communication with follow-up in test setup |

#### Scenario: All skipped tests have documented reasons
- **GIVEN** the set of skipped E2E tests
- **WHEN** reviewed against this specification
- **THEN** every `test.skip` call has a corresponding entry in the table above with a reason
