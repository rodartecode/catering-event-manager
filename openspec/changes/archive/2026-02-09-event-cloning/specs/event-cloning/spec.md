## ADDED Requirements

### Requirement: Administrator can clone an event
The system SHALL provide an `event.clone` tRPC mutation that creates a new event by deep-copying an existing source event and its associated tasks. The mutation SHALL be restricted to users with the administrator role.

#### Scenario: Clone event with default settings
- **WHEN** an administrator calls `event.clone` with a valid `sourceEventId` and a new `eventDate`
- **THEN** the system creates a new event with the source event's `eventName`, `location`, `estimatedAttendees`, and `notes` copied over
- **AND** the new event's status is set to `inquiry`
- **AND** the new event's `clonedFromEventId` is set to the source event's ID
- **AND** the new event's `clientId` is set to the source event's `clientId`

#### Scenario: Clone event with field overrides
- **WHEN** an administrator calls `event.clone` with a `sourceEventId`, `eventDate`, and one or more override fields (`clientId`, `eventName`, `location`, `estimatedAttendees`, `notes`)
- **THEN** the system creates a new event using the override values for provided fields and the source event's values for omitted fields

#### Scenario: Clone from non-existent event
- **WHEN** an administrator calls `event.clone` with a `sourceEventId` that does not exist
- **THEN** the system returns a `NOT_FOUND` error

#### Scenario: Non-administrator attempts clone
- **WHEN** a non-administrator user calls `event.clone`
- **THEN** the system returns a `FORBIDDEN` error

### Requirement: Clone operation copies tasks with recalculated due dates
The system SHALL copy all tasks from the source event to the new event. Each cloned task SHALL have its `status` reset to `pending`, `assignedTo` set to null, `isOverdue` set to false, and `completedAt` set to null.

#### Scenario: Tasks with due dates are recalculated
- **WHEN** a source event has tasks with due dates
- **THEN** each cloned task's due date SHALL be calculated as: `newEventDate + (sourceTask.dueDate - sourceEvent.eventDate)`

#### Scenario: Tasks without due dates are copied as-is
- **WHEN** a source event has tasks with null due dates
- **THEN** the cloned tasks SHALL have null due dates

#### Scenario: Task fields are preserved
- **WHEN** tasks are cloned
- **THEN** each cloned task SHALL retain the source task's `title`, `description`, and `category`

### Requirement: Clone operation preserves task dependency chains
The system SHALL remap `dependsOnTaskId` references so that dependencies point to the corresponding cloned tasks in the new event, not to the original source tasks.

#### Scenario: Linear dependency chain
- **WHEN** source event has Task A → Task B → Task C (B depends on A, C depends on B)
- **THEN** the cloned event SHALL have Cloned-A → Cloned-B → Cloned-C with dependencies pointing to the new task IDs

#### Scenario: Task depends on task outside source event
- **WHEN** a source task's `dependsOnTaskId` references a task that does not belong to the source event
- **THEN** the cloned task's `dependsOnTaskId` SHALL be set to null

### Requirement: Clone operation runs in a single transaction
The system SHALL execute the entire clone operation (event insert, task inserts, dependency remapping) within a single database transaction. If any step fails, no records SHALL be created.

#### Scenario: Partial failure rolls back
- **WHEN** the clone operation fails during task insertion
- **THEN** the new event record SHALL not exist in the database
- **AND** no cloned tasks SHALL exist in the database

### Requirement: Cloning is allowed from any event status
The system SHALL allow cloning from events in any status (`inquiry`, `planning`, `preparation`, `in_progress`, `completed`, `follow_up`) and from archived events.

#### Scenario: Clone a completed event
- **WHEN** an administrator clones an event with status `completed`
- **THEN** the clone succeeds and the new event starts at status `inquiry`

#### Scenario: Clone an archived event
- **WHEN** an administrator clones an event that is archived
- **THEN** the clone succeeds and the new event is not archived

### Requirement: Event lineage tracking
The `events` table SHALL have a nullable `cloned_from_event_id` column (foreign key to `events.id` with `SET NULL` on delete) that records which event was used as the clone source.

#### Scenario: Lineage is queryable
- **WHEN** an event is created via cloning
- **THEN** the `clonedFromEventId` field SHALL be visible in `event.getById` responses

#### Scenario: Source event deletion preserves clone
- **WHEN** a source event is deleted
- **THEN** the cloned event's `clonedFromEventId` SHALL be set to null (not cascade deleted)

### Requirement: Clone event UI action
The event detail page SHALL display a "Clone Event" button visible only to administrators. Clicking it SHALL open a dialog pre-filled with the source event's details where the administrator can modify fields before confirming.

#### Scenario: Clone dialog pre-fills source values
- **WHEN** an administrator clicks "Clone Event" on an event detail page
- **THEN** a dialog opens with the source event's name, location, estimated attendees, and notes pre-filled
- **AND** the event date field is empty (required input)
- **AND** the client is pre-filled with the source event's client

#### Scenario: Clone dialog requires new event date
- **WHEN** an administrator attempts to confirm the clone dialog without entering an event date
- **THEN** the dialog SHALL display a validation error and prevent submission

#### Scenario: Successful clone navigates to new event
- **WHEN** the clone operation completes successfully
- **THEN** the user SHALL be navigated to the newly created event's detail page
- **AND** a success notification is displayed
