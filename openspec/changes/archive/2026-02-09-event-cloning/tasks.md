## 1. Database Migration

- [x] 1.1 Add nullable `cloned_from_event_id` column to `events` schema in `packages/database/src/schema/events.ts` (integer FK → events.id, `SET NULL` on delete)
- [x] 1.2 Generate Drizzle migration with `pnpm db:generate`
- [x] 1.3 Verify migration applies cleanly and existing data is unaffected

## 2. Clone Mutation

- [x] 2.1 Define `cloneEventInput` Zod schema in `apps/web/src/server/routers/event.ts` (required: `sourceEventId`, `eventDate`; optional: `clientId`, `eventName`, `location`, `estimatedAttendees`, `notes`)
- [x] 2.2 Implement `event.clone` adminProcedure mutation: validate source event exists, create new event record with overrides, set `clonedFromEventId`
- [x] 2.3 Add task cloning within the same transaction: copy all source tasks, reset `status`/`assignedTo`/`isOverdue`/`completedAt`, recalculate due dates via offset from source event date
- [x] 2.4 Implement dependency remapping: build old→new task ID map, remap `dependsOnTaskId` for tasks within the source event, set to null for external references
- [x] 2.5 Add `clonedFromEventId` to the `event.getById` response so lineage is visible

## 3. Clone Mutation Tests

- [x] 3.1 Test clone with default settings (copies all fields, status is `inquiry`, lineage set)
- [x] 3.2 Test clone with field overrides (client, name, location, attendees, notes)
- [x] 3.3 Test clone copies tasks with recalculated due dates
- [x] 3.4 Test clone preserves task dependency chain (linear A→B→C)
- [x] 3.5 Test clone handles tasks with null due dates
- [x] 3.6 Test clone resets task status, assignment, overdue, completedAt
- [x] 3.7 Test clone from completed and archived events succeeds
- [x] 3.8 Test clone with non-existent sourceEventId returns NOT_FOUND
- [x] 3.9 Test non-administrator is rejected with FORBIDDEN
- [x] 3.10 Test transaction rollback on failure (no partial records)

## 4. Clone UI

- [x] 4.1 Create `CloneEventDialog` component with form fields (date required, others pre-filled from source event)
- [x] 4.2 Add "Clone Event" button to event detail page, visible only to administrators
- [x] 4.3 Wire dialog to `event.clone` mutation with loading/error states
- [x] 4.4 Navigate to new event detail page on successful clone with success toast

## 5. UI Tests

- [x] 5.1 Test `CloneEventDialog` renders pre-filled fields from source event
- [x] 5.2 Test date field validation (required, prevents empty submission)
- [x] 5.3 Test clone button visibility (shown for admin, hidden for non-admin)
- [x] 5.4 Test successful clone triggers navigation and success notification
