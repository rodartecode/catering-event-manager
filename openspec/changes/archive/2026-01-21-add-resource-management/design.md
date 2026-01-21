# Design: Resource Management and Conflict Detection

## Context

Resource management spans both TypeScript (Next.js) and Go (scheduling service) codebases. The <100ms conflict detection requirement (SC-003) necessitates the Go service for performance-critical scheduling queries, while CRUD operations remain in Next.js for consistency with the rest of the application.

**Stakeholders**: Catering administrators (create resources), managers (assign resources to tasks)

**Constraints**:
- PostgreSQL 17 required for GiST index support on `tstzrange`
- Go 1.23+ required for generics in conflict detection
- Conflict detection must complete in <100ms for real-time UI feedback

## Goals / Non-Goals

**Goals**:
- Implement FR-015 through FR-019 (resource types, assignment, availability, schedules, conflict warnings)
- Achieve SC-003 (100% conflict detection before assignment)
- Real-time conflict warnings in UI during resource selection
- Resource schedule visualization (calendar view)

**Non-Goals**:
- Resource cost tracking/billing (Phase 6 analytics)
- External calendar integration (future enhancement)
- Batch resource import (manual creation sufficient for MVP)
- Material inventory management (out of scope)

## Decisions

### Decision 1: Hybrid Service Pattern for Conflict Detection

**What**: CRUD operations in Next.js tRPC, conflict detection in Go service
**Why**: Go provides 7-11x faster execution for time-range overlap queries compared to Node.js. The <100ms requirement for real-time conflict feedback requires this performance.

**Flow**:
```
UI → tRPC (resource.checkConflicts) → HTTP client → Go service → PostgreSQL (GiST query)
         ↓
    Return conflicts to UI in <100ms
```

**Alternatives considered**:
- All in Next.js: Rejected - Node.js cannot meet <100ms with complex time-range queries
- All in Go: Rejected - Would duplicate auth logic and break tRPC type safety

### Decision 2: PostgreSQL GiST Index on tstzrange

**What**: Use `tstzrange` column type with GiST index for schedule time ranges
**Why**: GiST indexes enable O(log n) overlap detection using the `&&` operator, critical for <100ms queries at scale.

**Schema**:
```sql
CREATE TABLE resource_schedule (
  id UUID PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES resources(id),
  event_id UUID NOT NULL REFERENCES events(id),
  time_range tstzrange NOT NULL,
  EXCLUDE USING GIST (resource_id WITH =, time_range WITH &&)
);
```

The `EXCLUDE` constraint prevents inserting overlapping ranges at the database level.

**Alternatives considered**:
- Separate start_time/end_time columns: Rejected - Requires manual overlap checking, slower queries
- Application-level conflict detection: Rejected - Race conditions, cannot guarantee 100% detection

### Decision 3: HTTP Client for Go Service Communication

**What**: Create a typed HTTP client in tRPC layer to call Go scheduling endpoints
**Why**: Maintains separation of concerns while enabling typed communication.

**Implementation** (`apps/web/src/server/services/scheduling-client.ts`):
```typescript
export const schedulingClient = {
  checkConflicts: async (input: CheckConflictsInput): Promise<Conflict[]> => {
    const response = await fetch(`${SCHEDULING_SERVICE_URL}/api/v1/scheduling/check-conflicts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response.json();
  },
  // ...
};
```

**Alternatives considered**:
- gRPC: Rejected - Added complexity for internal service, HTTP sufficient
- Direct database query from Go: This IS the approach - Go queries PostgreSQL directly

### Decision 4: SSE for Real-Time Conflict Updates

**What**: Server-Sent Events push conflict status changes to connected clients
**Why**: Reuses existing SSE infrastructure from event subscriptions, lightweight, no WebSocket complexity.

**Flow**: When a resource is assigned elsewhere, connected clients viewing that resource's schedule receive an update within 2 seconds (SC-004).

## Risks / Trade-offs

### Risk 1: Go Service Availability
**Risk**: If Go service is down, conflict detection fails
**Mitigation**:
- Health check endpoint monitored by orchestrator
- Fallback: Allow assignment with warning "Unable to verify conflicts"
- Circuit breaker in scheduling client with 5-second timeout

### Risk 2: GiST Index Maintenance Overhead
**Risk**: GiST indexes slow down writes
**Trade-off**: Accepted - Read performance (conflict detection) is more critical than write speed for schedules. Schedule updates are infrequent compared to conflict checks.

### Risk 3: Time Zone Handling
**Risk**: `tstzrange` stores times in UTC; UI must handle local time conversion
**Mitigation**: All times stored as UTC in database. Frontend converts to user's local time. Go service and tRPC always work in UTC.

## Migration Plan

1. **Database migration** (0003_resources.sql):
   - Run `pnpm db:push` or `pnpm db:migrate`
   - GiST index created automatically with `EXCLUDE` constraint

2. **Go service deployment**:
   - Generate SQLC code: `cd apps/scheduling-service && sqlc generate`
   - Build and deploy: `go build -o bin/scheduler cmd/scheduler/main.go`
   - Verify health: `curl http://localhost:8080/api/v1/health`

3. **Rollback**:
   - Remove resource router from `_app.ts`
   - Migration rollback: `DROP TABLE resource_schedule, task_resources, resources;`

## Open Questions

1. **Material tracking**: Should materials have quantity limits? (Deferred to Phase 6)
2. **Conflict override**: Should administrators be able to force-assign despite conflicts? (Currently: yes, with logged warning)
3. **Resource availability hours**: Should resources have working hours constraints? (Deferred - currently 24/7 availability assumed)
