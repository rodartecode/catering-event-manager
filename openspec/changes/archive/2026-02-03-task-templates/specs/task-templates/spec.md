## ADDED Requirements

### Requirement: System maintains task templates

The system SHALL store task templates containing reusable task definitions. Each template SHALL have a name and optional description. Each template item SHALL define a title, category (pre_event, during_event, post_event), days offset relative to event date, and optional dependency on another item within the same template.

#### Scenario: Template with multiple items and dependencies
- **WHEN** a template "Standard Event" exists with items at different offsets
- **THEN** the system stores all items with their relative timing and dependency references

#### Scenario: Template item references another item as dependency
- **WHEN** a template item has dependsOnIndex pointing to another item's sortOrder
- **THEN** the system maintains this reference for use during task generation

---

### Requirement: Users can list available templates

The system SHALL provide a list of all available task templates. The list SHALL include each template's name, description, and the count of items it contains.

#### Scenario: List templates for dropdown selection
- **WHEN** a user requests the template list
- **THEN** the system returns all templates with name, description, and item count

#### Scenario: Empty template list
- **WHEN** no templates exist in the system
- **THEN** the system returns an empty list

---

### Requirement: Users can view template details

The system SHALL allow users to view the complete details of a template, including all items with their titles, descriptions, categories, day offsets, and dependencies.

#### Scenario: View template with items
- **WHEN** a user requests template details for a valid template ID
- **THEN** the system returns the template with all items sorted by sortOrder

#### Scenario: View non-existent template
- **WHEN** a user requests template details for an invalid template ID
- **THEN** the system returns a NOT_FOUND error

---

### Requirement: Template tasks are generated when creating an event with a template

The system SHALL generate tasks from a template when an event is created with a templateId. For each template item, the system SHALL create a task with:
- Title and description copied from the template item
- Category copied from the template item
- Due date calculated as event date plus days offset
- Dependency mapped from template item references to newly created task IDs
- Status set to "pending"

#### Scenario: Create event with template generates all tasks
- **WHEN** a user creates an event with templateId referencing a template with 12 items
- **THEN** the system creates 12 tasks linked to the event with calculated due dates

#### Scenario: Task dependencies are preserved during generation
- **WHEN** a template item depends on another item (via dependsOnIndex)
- **THEN** the generated task's dependsOnTaskId references the corresponding generated task

#### Scenario: Create event without template creates no tasks
- **WHEN** a user creates an event without specifying a templateId
- **THEN** the system creates the event with no automatically generated tasks

#### Scenario: Invalid template ID returns error
- **WHEN** a user creates an event with a templateId that does not exist
- **THEN** the system returns a NOT_FOUND error and does not create the event

---

### Requirement: Events track which template was used

The system SHALL store an optional reference from events to the template used for initial task generation. This reference SHALL be nullable and SHALL be set to NULL if the referenced template is deleted.

#### Scenario: Event stores template reference
- **WHEN** an event is created with a template
- **THEN** the event record includes the templateId

#### Scenario: Template deletion preserves events
- **WHEN** a template is deleted
- **THEN** events that used that template remain intact with templateId set to NULL

---

### Requirement: System provides pre-defined templates

The system SHALL include pre-seeded templates for common catering scenarios:
- "Standard Event" with approximately 12 tasks covering pre-event, during-event, and post-event phases
- "Large Event / Wedding" with approximately 14 tasks including vendor coordination
- "Simple Delivery" with approximately 8 tasks for drop-off service

#### Scenario: Pre-defined templates are available after deployment
- **WHEN** the system is deployed with migrations applied
- **THEN** users can select from at least 3 pre-defined templates
