## Why

Catering companies frequently run similar events — recurring corporate lunches, seasonal galas, repeat client engagements. Currently, administrators must manually recreate events from scratch each time, re-entering details, re-adding tasks, and re-assigning resources. Event cloning eliminates this repetitive setup by letting administrators duplicate a completed or in-progress event as a starting point for a new one.

## What Changes

- Add an `event.clone` tRPC mutation that deep-copies an event and its associated tasks
- Accept overrides for the new event (client, date, name, location, attendees) at clone time
- Copy all tasks from the source event, resetting statuses to `pending` and recalculating due dates relative to the new event date
- Preserve task dependency chains in the cloned event (remap `dependsOnTaskId` to new task IDs)
- Optionally apply a task template instead of copying source tasks (user choice at clone time)
- Add a "Clone Event" action to the event detail page UI
- Add a clone dialog/form for setting overrides before confirming
- Track lineage: store `clonedFromEventId` on the new event for traceability

## Capabilities

### New Capabilities
- `event-cloning`: Deep-copy events with tasks, date recalculation, dependency remapping, and optional overrides

### Modified Capabilities
_(none — this is additive; existing event CRUD, task management, and resource scheduling behaviors are unchanged)_

## Impact

- **Database**: Add nullable `cloned_from_event_id` column to `events` table (migration required)
- **tRPC API**: New `event.clone` mutation in `apps/web/src/server/routers/event.ts`
- **UI**: New clone button + dialog on event detail page (`apps/web/src/components/events/`)
- **Tests**: New router tests for clone mutation, UI component tests for clone dialog
- **Go service**: No changes — resource scheduling is not copied (resources are time-bound and must be reassigned for new dates)
- **Existing behavior**: No breaking changes; `event.create`, `event.list`, `event.getById` remain unchanged
