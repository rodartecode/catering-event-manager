# monorepo-configuration Spec Delta

## MODIFIED Requirements

### Requirement: tRPC subscription compatibility

Real-time data updates MUST NOT crash the application. Until subscription infrastructure (SSE transport + server-side event source) is built, real-time updates MUST use query polling.

**Priority**: P1
**Status**: Draft

#### Scenario: Event detail page loads without crash
- **Given** a tRPC client configured with `httpBatchLink` only
- **When** navigating to an event detail page (`/events/[id]`)
- **Then** the page renders successfully without runtime errors
- **And** event data is displayed correctly

#### Scenario: Event data refreshes automatically
- **Given** an event detail page is open
- **When** the event's status is changed by another user
- **Then** the updated status is visible within 10 seconds via polling
- **And** no manual page refresh is required

## REMOVED Requirements

### Requirement: tRPC subscription compatibility (original)

> Real-time subscriptions MUST use the correct API for tRPC v11.

**Reason**: The subscription procedures are empty placeholders with no server-side event source. Calling `useSubscription` with `httpBatchLink` crashes the page. Removed in favor of polling-based requirement above until subscription infrastructure is built.
