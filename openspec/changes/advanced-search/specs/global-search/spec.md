## ADDED Requirements

### Requirement: Global search endpoint
The system SHALL provide a `search.global` tRPC query procedure that accepts a query string and returns matching results across events, clients, tasks, and resources. The procedure SHALL require authentication (protectedProcedure). The query string MUST be at least 2 characters. Results SHALL be grouped by entity type with a maximum of 5 results per entity.

#### Scenario: Search matching events by name
- **WHEN** an authenticated user calls `search.global` with query "wedding"
- **THEN** the system returns events where `event_name` or `location` contains "wedding" (case-insensitive), up to 5 results, each including `id`, `eventName`, `location`, `status`, and `eventDate`

#### Scenario: Search matching clients by company name
- **WHEN** an authenticated user calls `search.global` with query "acme"
- **THEN** the system returns clients where `company_name`, `contact_name`, or `email` contains "acme" (case-insensitive), up to 5 results, each including `id`, `companyName`, `contactName`, and `email`

#### Scenario: Search matching tasks by title
- **WHEN** an authenticated user calls `search.global` with query "setup"
- **THEN** the system returns tasks where `title` contains "setup" (case-insensitive), up to 5 results, each including `id`, `title`, `status`, `eventId`, and `category`

#### Scenario: Search matching resources by name
- **WHEN** an authenticated user calls `search.global` with query "chef"
- **THEN** the system returns resources where `name` contains "chef" (case-insensitive), up to 5 results, each including `id`, `name`, `type`, and `isAvailable`

#### Scenario: Search returns results from multiple entities
- **WHEN** an authenticated user calls `search.global` with a query that matches records across multiple entities
- **THEN** the system returns a response with `events`, `clients`, `tasks`, and `resources` arrays, each containing their respective matches (may be empty)

#### Scenario: Query too short
- **WHEN** an authenticated user calls `search.global` with a query shorter than 2 characters
- **THEN** the system rejects the request with a validation error

#### Scenario: No matches found
- **WHEN** an authenticated user calls `search.global` with a query that matches no records
- **THEN** the system returns empty arrays for all entity types

#### Scenario: Archived events excluded
- **WHEN** an authenticated user calls `search.global` with a query matching an archived event
- **THEN** the archived event SHALL NOT appear in the events results

### Requirement: Per-entity search filtering on event list
The system SHALL accept an optional `query` string parameter on the `event.list` procedure. When provided (minimum 2 characters), the system SHALL filter events where `event_name` or `location` matches the query using case-insensitive substring matching. This filter SHALL combine with all existing filters (status, clientId, dateFrom, dateTo).

#### Scenario: Filter events by name query
- **WHEN** an authenticated user calls `event.list` with query "gala"
- **THEN** only events where `event_name` or `location` contains "gala" (case-insensitive) are returned

#### Scenario: Combine query with status filter
- **WHEN** an authenticated user calls `event.list` with query "gala" and status "planning"
- **THEN** only events matching both the text query and status filter are returned

#### Scenario: No query provided
- **WHEN** an authenticated user calls `event.list` without a query parameter
- **THEN** the behavior is identical to the existing implementation (no text filtering applied)

### Requirement: Per-entity search filtering on client list
The system SHALL accept an optional `query` string parameter on the `clients.list` procedure. When provided (minimum 2 characters), the system SHALL filter clients where `company_name`, `contact_name`, or `email` matches the query using case-insensitive substring matching.

#### Scenario: Filter clients by contact name
- **WHEN** an authenticated user calls `clients.list` with query "smith"
- **THEN** only clients where `company_name`, `contact_name`, or `email` contains "smith" (case-insensitive) are returned

#### Scenario: No query provided
- **WHEN** an authenticated user calls `clients.list` without a query parameter
- **THEN** the behavior is identical to the existing implementation (all clients returned)

### Requirement: Per-entity search filtering on task list
The system SHALL accept an optional `query` string parameter on the `task.listByEvent` procedure. When provided (minimum 2 characters), the system SHALL filter tasks where `title` matches the query using case-insensitive substring matching. This filter SHALL combine with all existing filters (status, category, overdueOnly, assignedToMe).

#### Scenario: Filter tasks by title query
- **WHEN** an authenticated user calls `task.listByEvent` with eventId and query "decor"
- **THEN** only tasks for that event where `title` contains "decor" (case-insensitive) are returned

#### Scenario: Combine query with status filter
- **WHEN** an authenticated user calls `task.listByEvent` with query "decor" and status "pending"
- **THEN** only tasks matching both the text query and status filter are returned

### Requirement: Per-entity search filtering on resource list
The system SHALL accept an optional `query` string parameter on the `resource.list` procedure. When provided (minimum 2 characters), the system SHALL filter resources where `name` matches the query using case-insensitive substring matching. This filter SHALL combine with existing filters (type, isAvailable).

#### Scenario: Filter resources by name query
- **WHEN** an authenticated user calls `resource.list` with query "oven"
- **THEN** only resources where `name` contains "oven" (case-insensitive) are returned

#### Scenario: Combine query with type filter
- **WHEN** an authenticated user calls `resource.list` with query "oven" and type "equipment"
- **THEN** only resources matching both the text query and type filter are returned

### Requirement: Search bar UI component
The system SHALL display a search bar in the dashboard layout header area, visible on all dashboard pages to authenticated users. The search bar SHALL debounce input by 300ms before triggering API calls. The search bar SHALL show an inline dropdown with up to 3 results per entity type while the user is typing. Pressing Enter or clicking a submit action SHALL navigate to `/search?q={query}`.

#### Scenario: User types in search bar
- **WHEN** a user types "wed" in the search bar and pauses for 300ms
- **THEN** the system calls `search.global` with query "wed" and displays matching results in a dropdown grouped by entity type

#### Scenario: User selects a result from dropdown
- **WHEN** a user clicks on an event result in the search dropdown
- **THEN** the user is navigated to the event detail page (`/events/{id}`)

#### Scenario: User submits search
- **WHEN** a user presses Enter in the search bar with query "wedding"
- **THEN** the user is navigated to `/search?q=wedding`

#### Scenario: Dropdown dismissed on blur
- **WHEN** the search bar loses focus
- **THEN** the dropdown closes

### Requirement: Search results page
The system SHALL provide a `/search` page that reads the `q` query parameter and displays categorized results from `search.global`. Results SHALL be grouped by entity type (Events, Clients, Tasks, Resources) with section headers. Each result SHALL link to its detail page. Empty categories SHALL be hidden. When no results match, the page SHALL display a "No results found" message.

#### Scenario: View search results page
- **WHEN** a user navigates to `/search?q=wedding`
- **THEN** the page displays results grouped by entity type, each result linking to its detail page

#### Scenario: No results
- **WHEN** a user navigates to `/search?q=xyznonexistent`
- **THEN** the page displays a "No results found" message

#### Scenario: Missing query parameter
- **WHEN** a user navigates to `/search` without a `q` parameter
- **THEN** the page displays the search bar with a prompt to enter a search term
