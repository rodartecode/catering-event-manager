## Context

The event management system currently supports creating events from scratch or from task templates. Events have associated tasks (with dependencies and due dates), resource schedules, and communications. The `event.create` mutation already handles template-based task generation, including dependency remapping and date offset calculation.

Event cloning extends this by copying an *existing event* — including its actual tasks — so administrators can reuse past event configurations rather than starting from a template or blank slate. This is a single-service change touching the Next.js tRPC layer and the database schema.

## Goals / Non-Goals

**Goals:**
- Clone an event and its tasks in a single transactional operation
- Recalculate task due dates relative to the new event date
- Preserve task dependency chains via ID remapping
- Allow overriding event fields (client, name, date, location, attendees) at clone time
- Track lineage via `clonedFromEventId` for auditing
- Provide a UI action on the event detail page

**Non-Goals:**
- Cloning resource schedules (resources are time-bound; new dates require fresh scheduling)
- Cloning communications (these are historical records tied to the original event)
- Cloning status history (the new event starts fresh at `inquiry`)
- Bulk cloning multiple events at once
- Recursive cloning (cloning a clone is allowed but won't copy the original's lineage chain)

## Decisions

### 1. Clone scope: event + tasks only

**Decision**: Copy the event record and its tasks. Do not copy resource schedules or communications.

**Rationale**: Tasks define the *work plan* and are reusable across dates. Resource schedules are time-specific (a staff member assigned on Jan 15 isn't automatically available on Mar 10). Communications are historical. Copying them would create misleading records.

**Alternative considered**: Copy resource assignments without time slots. Rejected because resource schedule entries without valid time ranges would violate the GiST exclusion constraint and require immediate manual fixup.

### 2. Due date recalculation via offset from original event date

**Decision**: For each source task with a due date, compute `offset = sourceTask.dueDate - sourceEvent.eventDate`, then set `newTask.dueDate = newEvent.eventDate + offset`.

**Rationale**: This preserves the relative timeline (e.g., "venue setup 3 days before event"). It mirrors the existing `daysOffset` pattern used in task templates.

**Alternative considered**: Copy absolute due dates. Rejected because the cloned event will almost certainly have a different date, making absolute dates meaningless.

### 3. Single tRPC mutation with transaction

**Decision**: Implement `event.clone` as an `adminProcedure` mutation that runs the entire operation (insert event, insert tasks, remap dependencies) inside a single database transaction.

**Rationale**: Ensures atomicity — either the full clone succeeds or nothing is created. Matches the existing pattern in `event.create` which uses a transaction for template-based task generation.

**Alternative considered**: Separate clone + copy-tasks mutations called in sequence. Rejected due to partial failure risk and unnecessary complexity.

### 4. Lineage tracking via nullable FK column

**Decision**: Add `cloned_from_event_id` (nullable integer FK → events.id, `SET NULL` on delete) to the `events` table.

**Rationale**: Simple, queryable, no schema bloat. `SET NULL` on delete prevents cascade issues if the source event is archived/deleted.

**Alternative considered**: Separate `event_lineage` junction table. Rejected as over-engineering for a single parent→child relationship.

### 5. Task assignment is not copied

**Decision**: Clone tasks with `assignedTo: null` regardless of the source task's assignment.

**Rationale**: Staff availability depends on the new event's date. Copying assignments would likely be wrong and create false expectations. Administrators should reassign after cloning.

### 6. UI: clone action on event detail page

**Decision**: Add a "Clone Event" button (visible to admins) on the event detail page that opens a dialog pre-filled with the source event's details. The user adjusts fields (required: new date; optional: client, name, location, attendees) and confirms.

**Rationale**: The event detail page is where administrators review event configurations. Cloning from this context is natural. A dialog avoids page navigation and keeps the workflow fast.

**Alternative considered**: Clone from the event list page. Rejected because the list view lacks enough context to make informed override decisions.

## Risks / Trade-offs

**Large task count performance** → The clone operation inserts N+1 rows (1 event + N tasks) sequentially due to dependency remapping. For events with 100+ tasks, this could take >1s. Mitigation: batch inserts where possible; accept sequential inserts only for tasks with dependencies. Practically, catering events rarely exceed 50 tasks.

**Orphaned dependency references** → If a source task's `dependsOnTaskId` points to a task outside the source event (data integrity issue), the remapping would silently drop the dependency. Mitigation: only remap dependencies within the source event's task set; log a warning for any unresolvable references.

**Cloning archived events** → Users may want to clone completed/archived events as templates for future events. Decision: allow cloning from any non-deleted event regardless of status or archive state.

## Migration Plan

1. **Database migration**: Add `cloned_from_event_id` column to `events` table (nullable, FK with `SET NULL` on delete). Non-breaking — existing rows get `NULL`.
2. **Deploy API**: Add `event.clone` mutation. No existing endpoints change.
3. **Deploy UI**: Add clone button + dialog. No existing UI changes.
4. **Rollback**: Drop the column migration. The mutation and UI become inert — no data loss.

## Open Questions

_(None — scope is well-defined and implementation is straightforward.)_
