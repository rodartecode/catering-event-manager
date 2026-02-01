# Change: Standardize Development Best Practices

## Why

The catering event management system has functional code but inconsistent practices across observability, data quality, and error handling. Before production deployment, we need to standardize these patterns to ensure:

1. **Debuggability** - Production issues are diagnosable through structured logs with context
2. **Data Quality** - Input normalization prevents subtle bugs from whitespace/case variations
3. **Error Recovery** - Rich error context enables faster incident resolution

Current state analysis found:
- 6 uses of structured `logger` vs 10+ direct `console.*` calls
- No `.trim()` on string inputs, allowing duplicate resources with trailing spaces
- Error catch blocks lacking context (just `if/else` without logging underlying cause)

## What Changes

### 1. Structured Logging Standardization (OBS-001)

Replace all `console.log/error/warn` calls with the existing structured logger utility:

**Files to update:**
- `apps/web/src/server/routers/clients.ts` - email failures
- `apps/web/src/lib/rate-limit.ts` - rate limit fallback
- `apps/web/src/lib/redis.ts` - Redis initialization
- `apps/web/src/lib/email.ts` - email errors
- `apps/web/src/app/api/cron/follow-ups/route.ts` - cron job logging

**Pattern:**
```typescript
// Before
console.error("[Portal] Failed to send welcome email:", error);

// After
logger.error('Portal access email failed', error instanceof Error ? error : new Error(String(error)), {
  clientId: client.id,
  context: 'enablePortalAccess',
});
```

### 2. Input Sanitization in Zod Schemas (DQ-001)

Add `.trim()` transformation to string inputs where semantically appropriate:

**Affected schemas:**
- Resource name inputs (prevent `"Staff"` vs `"Staff "` duplicates)
- Client company/contact names
- Event names/descriptions
- Task titles

**Email normalization:**
- Add `.toLowerCase().trim()` to email inputs

**Pattern:**
```typescript
// Before
name: z.string().min(1).max(255),

// After
name: z.string().min(1).max(255).trim(),
```

### 3. Error Context Enhancement (OBS-002)

Add structured error logging to catch blocks with contextual metadata:

**Affected routers:**
- `task.ts` - resource conflict check failures
- `resource.ts` - conflict detection errors
- `clients.ts` - email send failures
- `scheduling-client.ts` - Go service communication errors

**Pattern:**
```typescript
// Before
} catch (error) {
  if (error instanceof SchedulingClientError) {
    // handle silently
  }
}

// After
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  logger.error('Resource conflict check failed', error instanceof Error ? error : new Error(errorMessage), {
    resourceIds: resourceIds.slice(0, 3),
    taskId,
    timeRange: { start: startTime.toISOString(), end: endTime.toISOString() },
  });

  if (error instanceof SchedulingClientError) {
    // existing handling
  }
}
```

## Impact

- **Affected specs**:
  - NEW `observability` (logging and error context requirements)
  - NEW `data-quality` (input sanitization requirements)
- **Affected code**:
  - `apps/web/src/server/routers/*.ts` (Zod schemas, error handling)
  - `apps/web/src/lib/*.ts` (logging updates)
  - `apps/web/src/app/api/**/*.ts` (API route logging)
  - Go service already has structured logging (no changes needed)

## Dependencies

- Existing `logger.ts` utility (no new dependencies)

## Success Criteria

1. Zero `console.log/error/warn` calls in production code (verified via grep)
2. All string identifier inputs have `.trim()` transformation
3. All catch blocks with side effects include structured logging with context
4. Log output is valid JSON parseable by log aggregators
