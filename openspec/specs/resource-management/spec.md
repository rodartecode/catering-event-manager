# resource-management Specification

## Purpose
TBD - created by archiving change add-resource-management. Update Purpose after archive.
## Requirements
### Requirement: FR-015 Resource Types

The system SHALL support different resource types: staff, equipment, and materials.

Each resource MUST have:
- Unique identifier (UUID)
- Name (required, max 255 characters)
- Type (staff | equipment | materials)
- Hourly rate (optional, for cost tracking)
- Availability status (boolean)
- Creation and update timestamps

#### Scenario: Create staff resource
- **WHEN** an administrator creates a resource with type "staff"
- **THEN** the resource is created with staff type and appears in the staff resource list

#### Scenario: Create equipment resource
- **WHEN** an administrator creates a resource with type "equipment"
- **THEN** the resource is created with equipment type and appears in the equipment resource list

#### Scenario: Create materials resource
- **WHEN** an administrator creates a resource with type "materials"
- **THEN** the resource is created with materials type and appears in the materials resource list

#### Scenario: Filter resources by type
- **WHEN** a user views the resource list and selects a type filter
- **THEN** only resources of that type are displayed

---

### Requirement: FR-016 Resource Assignment

The system SHALL allow resources to be assigned to tasks and events.

Resource assignments MUST track:
- Which resource is assigned
- Which task (and by extension, event) it is assigned to
- The time range of the assignment
- When the assignment was created

#### Scenario: Assign single resource to task
- **WHEN** an administrator assigns a resource to a task
- **THEN** the resource appears in the task's assigned resources list
- **AND** a schedule entry is created for the resource

#### Scenario: Assign multiple resources to task
- **WHEN** an administrator assigns multiple resources to a task
- **THEN** all selected resources appear in the task's assigned resources list
- **AND** schedule entries are created for each resource

#### Scenario: Remove resource from task
- **WHEN** an administrator removes a resource assignment from a task
- **THEN** the resource no longer appears in the task's assigned resources
- **AND** the corresponding schedule entry is removed

#### Scenario: View assigned resources on task
- **WHEN** a user views a task detail page
- **THEN** they can see all resources assigned to that task with their types and availability

---

### Requirement: FR-017 Resource Availability and Conflict Detection

The system SHALL track resource availability and identify scheduling conflicts.

Conflict detection MUST:
- Complete within 100 milliseconds (performance requirement)
- Detect any time range overlap for the same resource
- Return all conflicting assignments with event details
- Use database-level constraints to prevent concurrent conflicting writes

#### Scenario: No conflicts found
- **WHEN** a user checks conflicts for a resource and time range
- **AND** the resource has no existing assignments that overlap
- **THEN** the system returns an empty conflicts list

#### Scenario: Single conflict detected
- **WHEN** a user checks conflicts for a resource and time range
- **AND** the resource has one existing assignment that overlaps
- **THEN** the system returns the conflicting assignment with event name and time range

#### Scenario: Multiple conflicts detected
- **WHEN** a user checks conflicts for multiple resources and a time range
- **AND** some resources have overlapping assignments
- **THEN** the system returns all conflicts grouped by resource

#### Scenario: Conflict detection performance
- **WHEN** conflict detection is performed
- **THEN** the response is returned within 100 milliseconds

---

### Requirement: FR-018 Resource Schedule View

The system SHALL allow viewing of resource schedules showing all assigned events and tasks.

Schedule views MUST:
- Show all assignments within a date range
- Support month and week view modes
- Display event name, task name (if applicable), and time range
- Update in real-time when assignments change

#### Scenario: View resource schedule for month
- **WHEN** a user views a resource's schedule in month view
- **THEN** they see all assignments for that month displayed on a calendar grid

#### Scenario: View resource schedule for week
- **WHEN** a user views a resource's schedule in week view
- **THEN** they see all assignments for that week with hourly time slots

#### Scenario: Navigate between date ranges
- **WHEN** a user navigates to a different month or week
- **THEN** the schedule updates to show assignments for the new date range

#### Scenario: Click assignment to view details
- **WHEN** a user clicks on an assignment in the schedule view
- **THEN** they are navigated to the associated event or task detail page

---

### Requirement: FR-019 Conflict Warnings Before Assignment

The system SHALL warn administrators when attempting to assign resources with scheduling conflicts.

Conflict warnings MUST:
- Appear before the assignment is confirmed
- List all conflicting events with their time ranges
- Allow administrators to proceed with assignment despite warnings (with logged override)
- Be displayed inline in the assignment dialog

#### Scenario: Warning shown before conflicting assignment
- **WHEN** an administrator selects a resource for assignment
- **AND** that resource has a conflicting assignment
- **THEN** a warning is displayed showing the conflicting event and time range

#### Scenario: Cancel assignment after seeing conflict
- **WHEN** an administrator sees a conflict warning
- **AND** chooses to cancel the assignment
- **THEN** the assignment is not created and the resource remains available

#### Scenario: Force assignment despite conflict
- **WHEN** an administrator sees a conflict warning
- **AND** chooses to proceed with the assignment anyway
- **THEN** the assignment is created
- **AND** the override is logged with the administrator's ID and timestamp

#### Scenario: Real-time conflict checking during selection
- **WHEN** an administrator selects resources in the assignment dialog
- **THEN** conflicts are checked automatically as selections are made
- **AND** warnings appear within 2 seconds of selection

