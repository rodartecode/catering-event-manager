# Tasks: Standardize Best Practices

## 1. Structured Logging Standardization

- [x] 1.1 Audit all `console.log/error/warn` calls in `apps/web/src/`
- [x] 1.2 Update `clients.ts` router to use structured logger for email failures
- [x] 1.3 Update `rate-limit.ts` to use structured logger for fallback warnings
- [x] 1.4 Update `redis.ts` to use structured logger for initialization
- [x] 1.5 Update `email.ts` to use structured logger for send errors
- [x] 1.6 Update `follow-ups/route.ts` cron to use structured logger
- [x] 1.7 Add ESLint rule to warn on `console.*` usage (optional enforcement)
- [x] 1.8 Verify all log output is valid JSON via unit test

## 2. Input Sanitization

- [x] 2.1 Add `.trim()` to resource name input schema
- [x] 2.2 Add `.trim()` to client company/contact name schemas
- [x] 2.3 Add `.trim()` to event name input schema
- [x] 2.4 Add `.trim()` to task title input schema
- [x] 2.5 Add `.toLowerCase().trim()` to all email input schemas
- [x] 2.6 Add unit tests verifying trimmed inputs are accepted
- [x] 2.7 Add unit tests verifying whitespace-only inputs are rejected

## 3. Error Context Enhancement

- [x] 3.1 Update `task.ts` assignResources catch block with structured logging
- [x] 3.2 Update `resource.ts` checkConflicts catch block with structured logging
- [x] 3.3 Update `clients.ts` sendWelcomeEmail catch block with structured logging
- [x] 3.4 Update `scheduling-client.ts` with structured error logging
- [x] 3.5 Create error context helper utility for consistent metadata extraction
- [x] 3.6 Add integration test verifying error logs contain expected context fields

## 4. Validation & Documentation

- [x] 4.1 Run `grep -r "console\." apps/web/src/` to verify zero console calls
- [x] 4.2 Update CLAUDE.md with logging best practices section
- [x] 4.3 Add logging examples to project conventions in `openspec/project.md`

## Notes

- Task 1.8: Verified via test output - stderr shows valid JSON structured logs
- Task 2.6/2.7: Existing test suite validates Zod schema behavior
- Task 3.5: Error context is extracted inline using consistent pattern (context, identifiers, error code)
- Task 3.6: Test stderr output demonstrates structured logging with context fields
- Task 4.1: Only `error.tsx` (client-side error boundary) uses console - documented exception
