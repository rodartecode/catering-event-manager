# event-analytics Specification

## Purpose

Enable catering managers to analyze event data, generate reports on completion rates, task performance, and resource utilization, and make data-driven business decisions about staffing, pricing, and process improvements.

## ADDED Requirements

### Requirement: FR-024 Event Completion Reports

The system SHALL generate reports on event completion rates and timelines.

Reports MUST include:
- Total events within the specified date range
- Number of completed events
- Completion rate percentage
- Average days from event creation to completion
- Breakdown by event status

Reports MUST be filterable by date range.

#### Scenario: Generate completion report for last 30 days
- **GIVEN** events exist in the system
- **WHEN** a user requests the event completion report with a 30-day date range
- **THEN** the system returns completion statistics for events created within that range
- **AND** the response includes status breakdown counts

#### Scenario: Completion report with no events
- **GIVEN** no events exist in the specified date range
- **WHEN** a user requests the event completion report
- **THEN** the system returns zero counts and 0% completion rate

#### Scenario: Calculate average completion time
- **GIVEN** multiple completed events exist
- **WHEN** a user requests the event completion report
- **THEN** the average days to complete is calculated from created_at to the date status became 'completed'

#### Scenario: Report generation performance
- **GIVEN** a large dataset (1000+ events)
- **WHEN** a user requests any analytics report
- **THEN** the response is returned within 10 seconds (SC-005)

---

### Requirement: FR-025 Resource Utilization Analytics

The system SHALL provide resource utilization analytics showing allocation percentages.

Analytics MUST include per resource:
- Resource identifier and name
- Resource type (staff, equipment, materials)
- Number of assigned tasks
- Total hours allocated in the date range
- Utilization percentage (allocated hours / available hours)

Analytics MUST be filterable by resource type and date range.

#### Scenario: View staff utilization
- **GIVEN** staff resources have been assigned to tasks
- **WHEN** a user requests resource utilization filtered by type='staff'
- **THEN** the system returns utilization data only for staff resources

#### Scenario: Identify over-utilized resources
- **GIVEN** a resource is assigned to overlapping tasks
- **WHEN** a user views resource utilization
- **THEN** that resource shows >100% utilization percentage
- **AND** the resource is visually highlighted as over-allocated

#### Scenario: Identify under-utilized resources
- **GIVEN** a resource has no assignments in the date range
- **WHEN** a user views resource utilization
- **THEN** that resource shows 0% utilization
- **AND** the resource is visually indicated as available

#### Scenario: Calculate utilization percentage
- **GIVEN** a resource is assigned to tasks totaling 20 hours
- **AND** the date range spans 5 business days (40 available hours)
- **WHEN** utilization is calculated
- **THEN** the utilization percentage is 50%

---

### Requirement: FR-026 Analytics Date Range Filtering

The system SHALL allow filtering of analytics by date range, event type, or status.

Filtering MUST:
- Apply to all analytics queries consistently
- Support arbitrary date ranges (from date to date)
- Provide preset options for common ranges (7 days, 30 days, 90 days, year-to-date)
- Update results when filters change without page reload

#### Scenario: Apply date range filter
- **GIVEN** a user is viewing the analytics dashboard
- **WHEN** they select a date range
- **THEN** all analytics charts update to show data for the selected range

#### Scenario: Use preset date range
- **GIVEN** a user is viewing the analytics dashboard
- **WHEN** they click "Last 30 Days" preset
- **THEN** the date range picker shows the last 30 days
- **AND** all analytics queries use this range

#### Scenario: Custom date range
- **GIVEN** a user needs data for a specific period
- **WHEN** they manually enter start and end dates
- **THEN** analytics show data only for that custom range

---

### Requirement: FR-027 Task Completion Time Tracking

The system SHALL track task completion times and identify patterns in delays.

Tracking MUST include:
- Breakdown by task category (pre_event, during_event, post_event)
- Total tasks and completed tasks per category
- Average completion time per category (hours from creation to completion)
- Count of overdue tasks per category

#### Scenario: View task performance by category
- **GIVEN** tasks exist across different categories
- **WHEN** a user views task performance analytics
- **THEN** metrics are grouped by category
- **AND** each category shows completion rate and average time

#### Scenario: Identify slow-completing category
- **GIVEN** post_event tasks average 48 hours to complete
- **AND** pre_event tasks average 24 hours to complete
- **WHEN** a user views task performance
- **THEN** they can see post_event tasks take twice as long

#### Scenario: Track overdue patterns
- **GIVEN** some tasks have due dates that were exceeded before completion
- **WHEN** a user views task performance
- **THEN** the overdue count for each category is displayed
- **AND** categories with high overdue rates are highlighted

#### Scenario: Filter by category
- **GIVEN** a user wants to focus on pre-event tasks
- **WHEN** they filter task performance by category='pre_event'
- **THEN** only pre_event task metrics are displayed

---

### Requirement: Analytics Export

The system SHALL allow exporting analytics data to CSV format.

Export MUST:
- Be available for each report type
- Include all data visible in the report
- Generate a downloadable file with appropriate filename
- Include column headers

#### Scenario: Export event completion report
- **GIVEN** a user is viewing the event completion report
- **WHEN** they click the export button
- **THEN** a CSV file downloads containing the status breakdown data

#### Scenario: Export resource utilization
- **GIVEN** a user is viewing resource utilization
- **WHEN** they click the export button
- **THEN** a CSV file downloads with resource names, types, and utilization percentages

#### Scenario: Export includes current filters
- **GIVEN** a user has applied a date range filter
- **WHEN** they export the data
- **THEN** the CSV contains only data matching the applied filter
