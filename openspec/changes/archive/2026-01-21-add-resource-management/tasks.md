# Tasks: Resource Management (Phase 5 / User Story 3)

**Change ID**: add-resource-management
**Source**: `specs/001-event-lifecycle-management/tasks.md` (T100-T130)

**Goal**: Enable managers to assign resources (staff, equipment, materials) to tasks, view resource schedules, and detect scheduling conflicts before assignment.

**Prerequisites**: Phase 4 (Task Management) complete

---

## 1. Database Layer

- [x] T100 [P] Create resources table schema in `packages/database/src/schema/resources.ts` with id, name, type (pgEnum), hourly_rate, is_available, created_at, updated_at
- [x] T101 [P] Create task_resources join table schema in `packages/database/src/schema/task-resources.ts` with task_id, resource_id, assigned_at, composite primary key
- [x] T102 [P] Create resource_schedule table schema in `packages/database/src/schema/resource-schedule.ts` with id, resource_id, event_id, task_id (nullable), time_range (tstzrange), notes
- [x] T103 Export new schemas from `packages/database/src/schema/index.ts`
- [x] T104 Create migration `packages/database/migrations/0003_resources.sql` with:
  - resources table with indexes on type, is_available
  - task_resources join table with foreign keys
  - resource_schedule with GiST index and EXCLUDE constraint for overlap detection
- [x] T105 Run `pnpm db:push` or `pnpm db:migrate` to apply migration, verify with `psql` or Drizzle Studio

---

## 2. Go Scheduling Service

- [x] T106 [P] Create Resource domain entity in `apps/scheduling-service/internal/domain/resource.go` with ID, Name, Type, HourlyRate, IsAvailable fields
- [x] T107 [P] Create Conflict domain type in `apps/scheduling-service/internal/domain/conflict.go` with ResourceID, ConflictingEventID, TimeRange, Message fields
- [x] T108 [P] Create CheckConflictsRequest/Response types in `apps/scheduling-service/internal/domain/conflict.go`
- [x] T109 Create SQLC query file `apps/scheduling-service/internal/repository/queries.sql` with:
  - GetResourceByID
  - ListResources (with type filter)
  - GetResourceSchedule (by resource_id and date range)
  - CheckConflicts (using `tstzrange && tstzrange` overlap)
  - CreateScheduleEntry
- [x] T110 Run `sqlc generate` in `apps/scheduling-service/` to generate Go types
- [x] T111 Implement conflict detection algorithm in `apps/scheduling-service/internal/scheduler/conflict.go`:
  - CheckConflicts(resourceIDs []uuid.UUID, timeRange TimeRange) []Conflict
  - Uses GiST index query for O(log n) performance
- [x] T112 [P] Implement availability service in `apps/scheduling-service/internal/scheduler/availability.go`:
  - GetResourceAvailability(resourceID uuid.UUID, dateRange DateRange) []TimeSlot
- [x] T113 Create POST `/api/v1/scheduling/check-conflicts` handler in `apps/scheduling-service/internal/api/handlers.go`:
  - Input: resource_ids, start_time, end_time
  - Output: conflicts array with resource_id, conflicting_event, time_range
- [x] T114 Create GET `/api/v1/scheduling/resource-availability` handler in `apps/scheduling-service/internal/api/handlers.go`:
  - Input: resource_id, start_date, end_date (query params)
  - Output: schedule entries with time ranges and event names
- [x] T115 Register new routes in `apps/scheduling-service/cmd/scheduler/main.go` with structured logging

---

## 3. tRPC Backend Layer

- [x] T116 [P] Create scheduling HTTP client in `apps/web/src/server/services/scheduling-client.ts`:
  - checkConflicts(input) → Conflict[]
  - getResourceAvailability(resourceId, dateRange) → ScheduleEntry[]
  - Handle timeout (5s), errors, circuit breaker pattern
- [x] T117 [P] Create resource router in `apps/web/src/server/routers/resource.ts` with base setup
- [x] T118 Implement `resource.create` mutation (adminProcedure):
  - Input: name, type, hourly_rate (optional), notes
  - Validate name uniqueness
  - Return created resource
- [x] T119 Implement `resource.list` query (protectedProcedure):
  - Input: type filter (optional), is_available filter (optional), pagination
  - Return resources with cursor pagination
- [x] T120 Implement `resource.getById` query (protectedProcedure):
  - Input: resource_id
  - Return resource with schedule summary
- [x] T121 Implement `resource.getSchedule` query calling Go service (protectedProcedure):
  - Input: resource_id, start_date, end_date
  - Call scheduling-client.getResourceAvailability
  - Return schedule entries with event details
- [x] T122 Implement `resource.checkConflicts` query calling Go service (protectedProcedure):
  - Input: resource_ids[], start_time, end_time
  - Call scheduling-client.checkConflicts
  - Return conflicts array
- [x] T123 Implement `task.assignResources` mutation in `apps/web/src/server/routers/task.ts`:
  - Input: task_id, resource_ids[]
  - Pre-check conflicts via resource.checkConflicts
  - If conflicts and force=false, return conflicts for user decision
  - If force=true or no conflicts, create task_resources entries and schedule entries
  - Log assignment with audit trail
- [x] T124 Register resource router in `apps/web/src/server/routers/_app.ts`

---

## 4. Frontend UI

- [x] T125 [P] Create resource list page `apps/web/src/app/(dashboard)/resources/page.tsx`:
  - Filter by type (staff, equipment, materials)
  - Filter by availability
  - Pagination
  - Link to individual resource schedule
- [x] T126 [P] Create resource creation page `apps/web/src/app/(dashboard)/resources/new/page.tsx`:
  - Form with name, type dropdown, hourly_rate (optional), notes
  - Admin-only access
- [x] T127 [P] Create resource schedule view `apps/web/src/app/(dashboard)/resources/[id]/page.tsx`:
  - Calendar component showing all scheduled events
  - Month/week toggle
  - Click event to view event details
- [x] T128 [P] Create ResourceCard component `apps/web/src/components/resources/ResourceCard.tsx`:
  - Display name, type badge, availability status
  - Link to schedule view
- [x] T129 [P] Create ResourceScheduleCalendar component `apps/web/src/components/resources/ResourceScheduleCalendar.tsx`:
  - Month view with event blocks
  - Week view with hourly slots
  - Color coding by event status
- [x] T130 [P] Create ConflictWarning component `apps/web/src/components/resources/ConflictWarning.tsx`:
  - Red alert banner
  - List conflicting events with times
  - "Assign Anyway" button (admin only)
- [x] T131 [P] Create ResourceAssignmentDialog component `apps/web/src/components/resources/ResourceAssignmentDialog.tsx`:
  - Multi-select dropdown for resources
  - Filter by type
  - Real-time conflict check on selection
  - Display ConflictWarning inline
- [x] T132 Add resource assignment section to task detail view:
  - List currently assigned resources
  - "Assign Resources" button opening ResourceAssignmentDialog
  - Show conflict warnings for existing assignments
- [x] T133 Implement real-time conflict checking in ResourceAssignmentDialog:
  - Debounced API call on resource selection
  - Show loading state during check
  - Update ConflictWarning dynamically

---

## Verification Checklist

After all tasks complete:

1. **Database**:
   - [x] `psql $DATABASE_URL -c "\d resources"` shows table structure
   - [x] `psql $DATABASE_URL -c "\d resource_schedule"` shows GiST index

2. **Go Service**:
   - [x] `go build` succeeds
   - [ ] `curl http://localhost:8080/api/v1/health` returns 200 (requires service running)

3. **TypeScript**:
   - [x] New resource router compiles (pre-existing type errors unrelated to resource code)
   - [ ] `pnpm test` passes (requires tests to be written)

4. **Manual Test** (deferred to QA):
   - [ ] Create resource (staff type)
   - [ ] Assign resource to task with time range
   - [ ] Attempt to assign same resource to overlapping time range
   - [ ] Verify conflict warning appears
   - [ ] View resource schedule shows both assignments

---

## Implementation Summary

### Files Created/Modified:

**Database Layer:**
- `packages/database/src/schema/resources.ts` - Extended with full table
- `packages/database/src/schema/task-resources.ts` - NEW
- `packages/database/src/schema/resource-schedule.ts` - NEW
- `packages/database/src/schema/index.ts` - Updated exports
- `packages/database/src/migrations/0003_resources.sql` - NEW

**Go Scheduling Service:**
- `apps/scheduling-service/internal/domain/resource.go` - NEW
- `apps/scheduling-service/internal/domain/conflict.go` - NEW
- `apps/scheduling-service/internal/repository/queries.sql` - NEW
- `apps/scheduling-service/internal/repository/connection.go` - NEW
- `apps/scheduling-service/internal/scheduler/conflict.go` - NEW
- `apps/scheduling-service/internal/scheduler/availability.go` - NEW
- `apps/scheduling-service/internal/api/handlers.go` - Updated
- `apps/scheduling-service/internal/logger/logger.go` - Updated with fluent API

**tRPC Backend:**
- `apps/web/src/server/services/scheduling-client.ts` - NEW
- `apps/web/src/server/routers/resource.ts` - NEW
- `apps/web/src/server/routers/task.ts` - Updated with assignResources
- `apps/web/src/server/routers/_app.ts` - Updated

**Frontend UI:**
- `apps/web/src/app/(dashboard)/resources/page.tsx` - NEW
- `apps/web/src/app/(dashboard)/resources/new/page.tsx` - NEW
- `apps/web/src/app/(dashboard)/resources/[id]/page.tsx` - NEW
- `apps/web/src/components/resources/ResourceCard.tsx` - NEW
- `apps/web/src/components/resources/ResourceTypeBadge.tsx` - NEW
- `apps/web/src/components/resources/ResourceForm.tsx` - NEW
- `apps/web/src/components/resources/ResourceScheduleCalendar.tsx` - NEW
- `apps/web/src/components/resources/ConflictWarning.tsx` - NEW
- `apps/web/src/components/resources/ResourceAssignmentDialog.tsx` - NEW
- `apps/web/src/components/resources/index.ts` - NEW
- `apps/web/src/components/tasks/TaskCard.tsx` - Updated with Resources button
- `apps/web/src/components/tasks/TaskList.tsx` - Updated with ResourceAssignmentDialog
