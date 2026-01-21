# Change: Add Resource Management and Conflict Detection

## Why

Phase 5 (User Story 3) implements resource assignment and scheduling conflict detection. Catering companies need to track staff, equipment, and materials assigned to events and prevent double-booking. Without this capability, scheduling conflicts lead to operational failures and poor resource utilization.

This enables SC-003 (100% conflict detection before assignment) through a Go scheduling service that achieves <100ms response times for conflict queries using PostgreSQL GiST indexes on time ranges.

## What Changes

### Database Layer (packages/database/src/schema/)
- **resources.ts**: Complete resource table with name, type, hourly_rate, is_available fields
- **task-resources.ts** (new): Join table for many-to-many task-resource assignments
- **resource-schedule.ts** (new): Time-range based scheduling with `tstzrange` column
- **index.ts**: Export new schemas
- Migration 0003_resources.sql with GiST index for O(log n) conflict queries

### Go Scheduling Service (apps/scheduling-service/)
- **internal/domain/resource.go** (new): Resource domain entity
- **internal/domain/conflict.go** (new): Conflict detection result types
- **internal/repository/queries.sql** (new): SQLC queries for conflict detection using `tstzrange && tstzrange` overlap operator
- **internal/scheduler/conflict.go** (new): Conflict detection algorithm
- **internal/scheduler/availability.go** (new): Resource availability tracking
- **internal/api/handlers.go**: Add `/api/v1/scheduling/check-conflicts` and `/api/v1/scheduling/resource-availability` endpoints

### tRPC Layer (apps/web/src/server/)
- **routers/resource.ts** (new): Resource CRUD with create, list, getSchedule, checkConflicts procedures
- **services/scheduling-client.ts** (new): HTTP client for Go service communication
- **routers/task.ts**: Add `assignResources` mutation with conflict pre-checking
- **routers/_app.ts**: Register resource router

### Frontend UI (apps/web/src/)
- **app/(dashboard)/resources/page.tsx** (new): Resource list with type filter
- **app/(dashboard)/resources/new/page.tsx** (new): Resource creation form
- **app/(dashboard)/resources/[id]/page.tsx** (new): Resource schedule calendar view
- **components/resources/** (new directory): ResourceScheduleCalendar, ConflictWarning, ResourceCard
- **components/tasks/ResourceAssignmentDialog.tsx** (new): Multi-select with real-time conflict warnings

## Impact

- **Affected specs**: resource-management (new capability)
- **Affected code**:
  - packages/database/src/schema/ (3 new files, 1 modified)
  - apps/scheduling-service/ (8 new files, 2 modified)
  - apps/web/src/server/ (3 new files, 2 modified)
  - apps/web/src/app/ (3 new pages)
  - apps/web/src/components/ (6 new components)
- **New capability**: No breaking changes, additive only
- **Dependencies**: Requires Phase 4 (tasks) completion for task-resource assignments
