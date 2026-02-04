## ADDED Requirements

### Requirement: Event creation accepts optional template selection

The system SHALL accept an optional templateId parameter when creating an event. When provided, the system SHALL validate that the template exists before creating the event. The event SHALL store a reference to the template used.

#### Scenario: Create event with valid template
- **WHEN** a user creates an event with a valid templateId
- **THEN** the system creates the event and generates tasks from the template

#### Scenario: Create event with invalid template
- **WHEN** a user creates an event with a templateId that does not exist
- **THEN** the system returns a NOT_FOUND error

#### Scenario: Create event without template
- **WHEN** a user creates an event without specifying a templateId
- **THEN** the system creates the event normally with no auto-generated tasks

---

### Requirement: Event form displays template selection

The system SHALL display an optional template dropdown in the event creation form. The dropdown SHALL show all available templates with their names and task counts. The dropdown SHALL default to "None" (no template).

#### Scenario: Template dropdown shows available options
- **WHEN** a user opens the event creation form
- **THEN** the system displays a template dropdown with "None" as the default option and all available templates listed

#### Scenario: Template selection shows task count
- **WHEN** templates are listed in the dropdown
- **THEN** each template option displays the template name and number of tasks (e.g., "Standard Event (12 tasks)")
