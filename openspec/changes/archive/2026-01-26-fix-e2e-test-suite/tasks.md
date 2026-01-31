# Tasks: Fix E2E Test Suite

## 1. Skip tests for unbuilt features
- [ ] 1.1 Skip all 13 portal tests (`portal.e2e.ts`) — portal auth flow not implemented
- [ ] 1.2 Skip resource schedule/conflict tests: `view resource schedule calendar`, `detect resource scheduling conflict`, `view conflict warning before assignment` — no resource detail page or schedule calendar
- [ ] 1.3 Skip resource assignment test: `assign resource to task` — UI does task-level assignment, test expects event-level
- [ ] 1.4 Skip task status update tests: `update task status: pending → in_progress`, `update task status: in_progress → completed` — TaskCard missing action buttons
- [ ] 1.5 Skip follow-up management tests: `schedule follow-up`, `view pending follow-ups`, `complete follow-up` — dedicated follow-up UI not built
- [ ] 1.6 Skip login error display tests: `user sees error with invalid credentials`, `user sees error with empty fields` — LoginForm doesn't surface auth errors
- [ ] 1.7 Add descriptive skip reasons referencing what app feature is needed

## 2. Add data-testid attributes to components
- [ ] 2.1 Add `data-testid="analytics-card"` to AnalyticsCard component
- [ ] 2.2 Add `data-testid="event-completion-chart"` to EventCompletionChart wrapper
- [ ] 2.3 Add `data-testid="resource-utilization"` to ResourceUtilization chart wrapper
- [ ] 2.4 Add `data-testid="task-performance"` to TaskPerformance chart wrapper
- [ ] 2.5 Add `data-testid="task-card"` to TaskCard component wrapper
- [ ] 2.6 Add `data-testid="overdue-indicator"` to OverdueIndicator component
- [ ] 2.7 Add `data-testid="status-timeline"` to EventStatusTimeline component
- [ ] 2.8 Add `data-testid="sidebar"` to Sidebar nav element
- [ ] 2.9 Add `data-testid="client-events"` to client events tab content

## 3. Fix selector and timing issues in passing-capable tests
- [ ] 3.1 Fix `view event in list` — update selector to match EventCard text rendering
- [ ] 3.2 Fix `view event status history/timeline` — verify timeline renders after data-testid added
- [ ] 3.3 Fix `archive completed event` — verify archive button selector and redirect handling
- [ ] 3.4 Fix `filter events by status` — update status badge selectors to match actual CSS classes
- [ ] 3.5 Fix `filter events by date range` — add waitFor after date input to handle async filtering
- [ ] 3.6 Fix `clear filters` — verify reset button selector
- [ ] 3.7 Fix `view task in event detail` — update to find task by text content instead of data-testid
- [ ] 3.8 Fix `assign task to user` — verify TaskForm has assigneeId field or skip
- [ ] 3.9 Fix `overdue task is visually marked` — verify OverdueIndicator renders after data-testid added
- [ ] 3.10 Fix `create equipment resource` — debug why same form as staff fails
- [ ] 3.11 Fix `view resources list` — verify seeded resource names match test expectations
- [ ] 3.12 Fix `filter resources by type` — verify filter select ID and options
- [ ] 3.13 Fix `create new client` — verify ClientForm field names match test selectors
- [ ] 3.14 Fix `view client in list` / `view client details` — verify client name rendering
- [ ] 3.15 Fix `record phone call communication` / `record email communication` — verify CommunicationForm selectors
- [ ] 3.16 Fix `view client event history` — verify events tab renders after data-testid added
- [ ] 3.17 Fix analytics tests — verify chart components render after data-testid added
- [ ] 3.18 Fix `admin can access all dashboard pages` — verify nav links and page loading
- [ ] 3.19 Fix `update event status: inquiry → planning` — verify EventStatusUpdateDialog selectors match
- [ ] 3.20 Fix `update event status through full lifecycle` — depends on 3.19

## 4. Update page helpers
- [ ] 4.1 Update `pages.ts` status badge selectors to match actual CSS classes
- [ ] 4.2 Verify navigation selectors in `pages.ts` match Sidebar link structure

## 5. Validation
- [ ] 5.1 Run full E2E suite with `npx playwright test --config=playwright.noserver.config.ts`
- [ ] 5.2 Confirm ~28+ tests pass, all skipped tests have documented reasons
- [ ] 5.3 Verify no regressions in the 5 currently-passing tests

### Dependencies
- Tier 1 (skip) has no dependencies — do first
- Tier 2 (data-testid) can be done in parallel across components
- Tier 3 (selector fixes) depends on Tier 2 for tests that use data-testid selectors
- Some Tier 3 items may convert to skips during debugging if the gap is in the app, not the test
