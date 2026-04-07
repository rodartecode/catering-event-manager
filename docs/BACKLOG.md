# Feature Backlog

Curated backlog for the catering event manager. Each item includes structured metadata for agent consumption.

**Field reference:**
- **Priority**: P1 (build next) → P4 (future/experimental)
- **Scope**: S (1-2 files, <1 day) · M (3-6 files, 1-3 days) · L (cross-cutting, 3-7 days) · XL (multi-phase, 1-2 weeks)
- **Touches**: schema · api · ui · go-service · infra · docs
- **Depends on**: items that must be completed first (by slug)
- **Done when**: brief acceptance criteria

---

## P1 — Build Next

_(No items — all P1 features complete)_

---

## P2 — High Value

### ~~notification-system~~ ✅ DONE (2026-03-30)
**In-app notifications and email digests**
- Scope: L
- Touches: schema, api, ui
- Implemented: Two-phase implementation. Phase 1: `notifications` table, `notification` tRPC router (6 procedures: list, markRead, markAllRead, getUnreadCount, getPreferences, updatePreference), notification service with fire-and-forget pattern, trigger wiring (task assignment, status changes, overdue tasks, follow-ups), bell icon + dropdown UI. Phase 2: `notification_preferences` table, preferences-aware notification service, email digest cron via Resend, preferences UI page with per-type in-app/email toggles. Migration 0009.

### ~~menu-planning~~ ✅ DONE (2026-03-19)
**Menu items, dietary management, and quantity calculation**
- Scope: L
- Touches: schema, api, ui
- Implemented: Three-table design (menu_items + event_menus + event_menu_items), 15 menu router procedures + 1 portal procedure, catalog UI, event menu builder, cost estimation, dietary summary, shopping list, client portal view. Migration 0007.

### ~~staff-skills~~ ✅ DONE (2026-04-01)
**Staff skills matrix and shift availability**
- Scope: M
- Touches: schema, api, ui
- Implemented: `staff_skills` junction (10-value enum) + `staff_availability` (weekly HH:MM slots) + `resources.user_id` FK bridge. Staff tRPC router (8 procedures: skills CRUD, availability CRUD, findAvailable with skill+time filtering, linkUserToResource, staff list/profile). Staff list page + profile page with inline editing. 5 components. Migration 0011 + 0012 (RLS). 39 router tests + 14 auth matrix tests.

### ~~bulk-operations~~ ✅ DONE (2026-03-31)
**Import/export events, batch status updates**
- Scope: M
- Touches: api, ui
- Implemented: CSV export for events/clients/tasks/resources (server-side), CSV import for events/clients with row-level validation and error reporting, batch status updates for events/tasks with all-or-nothing transactions. Shared UI: ExportButton, ImportDialog, BulkActionBar, BatchStatusDialog, useMultiSelect hook. 8 new tRPC procedures, 80 new tests.

### ~~gantt-chart~~ ✅ DONE (2026-03-15)
**Visual timeline of task dependencies**
- Scope: M
- Touches: ui
- Implemented: Gantt chart component on event detail page with task bars colored by status, dependency arrows, critical path highlighting, and horizontal scroll for long timelines.

### ~~drag-drop-scheduling~~ ✅ DONE (2026-04-01)
**Visual calendar-based resource assignment**
- Scope: L
- Touches: ui, api
- Implemented: Calendar view with day/week toggle using @dnd-kit. Drag-to-create, drag-to-move, resize schedule blocks. Go service conflict detection with force override. Resource filter sidebar. 7 components, 2 hooks, 4 new resource procedures. PR #41.

---

## P3 — Domain Differentiators

### ~~kitchen-production~~ DONE (2026-04-07)
**Kitchen production scheduling and station allocation**
- 2 tables (kitchen_stations, production_tasks) + 3 enums (station_type, prep_type, production_task_status)
- productionSteps JSONB on menu_items for auto-generation templates
- kitchenProduction tRPC router: 14 procedures (station CRUD, task CRUD, timeline, auto-generate)
- menu.updateProductionSteps procedure for step template editing
- 9 components: StationCard, StationForm, ProductionTimeline, ProductionTaskCard, ProductionTaskForm, ProductionStepsEditor, badges, skeleton
- 4 pages: station list, new/detail, event production timeline
- Go endpoint: POST /check-station-conflicts (capacity-aware conflict detection)
- 20 router tests + 2 Go tests

### ~~venue-database~~ DONE (PR #50, 2026-04-03)
**Venue profiles with logistics intelligence**
- `venues` table (28th): name, address, capacity, kitchen_type enum, equipment_available array, parking/load-in notes, contact info
- `events.venue_id` FK (nullable, ON DELETE SET NULL) — keeps `location` as ad-hoc fallback
- tRPC venue router: create, list (with search/kitchen/capacity filters), getById, update
- VenueSelect in event form auto-populates location from venue address
- VenueEquipmentChecklist compares venue equipment against event resources
- 3 pages: /venues, /venues/new, /venues/[id] with detail tabs
- 36 tests (19 router, 17 component)

### post-event-feedback
**Client feedback surveys and quality scoring**
- Scope: S
- Touches: schema, api, ui
- Depends on: none
- Done when:
  - `event_feedback` table: event_id, client_id, nps_score (0-10), food_rating, service_rating, comments, submitted_at
  - Auto-send feedback request email when event status → `completed`
  - Client portal: feedback submission form
  - Analytics: average NPS, ratings by staff/venue/menu
- Notes: Closes the loop on the event lifecycle. Correlating quality scores with staff assignments, menu choices, and venues produces actionable insights.

### ai-event-costing
**Historical cost analysis and anomaly detection**
- Scope: M
- Touches: api, ui
- Depends on: `financial-layer`, `menu-planning`
- Done when:
  - Cost comparison endpoint: given event parameters (attendees, menu type, venue), return percentile ranges from historical data
  - Event creation/editing shows "typical cost range" hint
  - Flag events whose cost estimate deviates >30% from comparable events
  - Uses simple statistics (averages, percentiles) — no ML required initially
- Notes: Needs historical cost data from the financial layer + menu data. Start simple with SQL aggregations. Can evolve to ML-based predictions later.

### vendor-management
**External vendor database and event assignments**
- Scope: M
- Touches: schema, api, ui
- Depends on: none
- Done when:
  - `vendors` table: company_name, contact_name, email, phone, service_type, notes
  - `event_vendors` junction: event_id, vendor_id, role, cost
  - tRPC: `vendor.create`, `vendor.list`, `vendor.getById`, `vendor.update`, `vendor.assignToEvent`
  - Event detail page shows assigned vendors with costs
  - Vendor list page with filtering by service type
- Notes: Many caterers subcontract (rentals, florals, AV, photography). Tracking vendor assignments per event feeds into cost tracking.

### time-tracking
**Log actual time spent on tasks**
- Scope: M
- Touches: schema, api, ui
- Depends on: none
- Done when:
  - `time_entries` table: task_id, user_id, started_at, ended_at, duration_minutes, notes
  - tRPC: `time.start`, `time.stop`, `time.log` (manual entry), `time.listByTask`, `time.listByUser`
  - Task detail shows time log with total
  - Timer widget on task card (start/stop)
  - Analytics: actual vs estimated time per task category
- Notes: Enables productivity metrics and more accurate future estimates. Pairs with `ai-event-costing` for labor cost predictions.

---

## P4 — Future / Experimental

### client-brief-auto-setup
**Parse client inquiry into event + menu + resources via LLM**
- Scope: M
- Touches: api, ui
- Depends on: `menu-planning`, `venue-database`
- Done when:
  - Text input or email paste → Claude API parses into structured event parameters
  - Auto-creates event with suggested venue, menu items, resource requirements
  - User reviews and confirms before saving
  - Works from natural language: "200-person corporate dinner, downtown venue, vegetarian options, budget $15k"
- Notes: Builds on event cloning + task templates + menu planning + venue database. Only useful after those foundations exist. Use Claude API (Anthropic SDK) for parsing.

### weather-alerts
**Weather-aware outdoor event alerts**
- Scope: S
- Touches: api, ui
- Depends on: `venue-database` (for outdoor venue flag)
- Done when:
  - Outdoor events flagged with weather check 48h/24h/6h before event
  - Weather data from public API (Open-Meteo or similar)
  - Alert banner on event detail page when severe weather forecasted
  - Notification triggered for event manager
- Notes: Many catering events are outdoor. Simple API integration with high practical value. Contingency suggestions (tent rental, indoor backup) are v2.

### smart-scheduling
**Auto-schedule tasks and resources based on skills/availability**
- Scope: L
- Touches: go-service, api, ui
- Depends on: `staff-skills`, `kitchen-production`
- Done when:
  - Given an event with tasks, auto-assign staff based on skills + availability
  - Optimize across concurrent events (minimize travel, balance workload)
  - User reviews suggested schedule and can adjust
  - Go service handles optimization algorithm
- Notes: Requires staff skills and kitchen production data. Constraint satisfaction problem — start with greedy heuristic, not full optimization.

### multi-tenancy
**Organization accounts and custom roles**
- Scope: XL
- Touches: schema, api, ui
- Depends on: none (but touches everything)
- Done when:
  - `organizations` table, all entities scoped to org_id
  - Custom role permissions (beyond admin/manager/client)
  - White-label client portal (custom branding per org)
  - User invitation flow with org context
- Notes: Major architectural change. Only pursue if targeting multi-customer SaaS. Current single-tenant model works fine for a single catering business.

### collaborative-editing
**Real-time multi-user editing with presence**
- Scope: XL
- Touches: api, ui
- Depends on: `notification-system`
- Done when:
  - WebSocket connection for real-time updates
  - Presence indicators (who's viewing/editing an entity)
  - Optimistic updates with conflict resolution
  - Activity feed showing recent changes across the system
- Notes: Replaces current polling. High complexity, moderate value for small teams. Consider only if team size grows beyond 5-10 concurrent users.

### custom-reports
**User-defined report configurations and exports**
- Scope: L
- Touches: api, ui
- Depends on: `financial-layer`
- Done when:
  - Report builder UI: select entity type, fields, filters, grouping, date range
  - PDF and Excel/CSV export
  - Saved report configurations per user
  - Scheduled report delivery via email
- Notes: Prerequisite: financial data to make reports meaningful. Basic export (CSV) should come with `bulk-operations` first.

### recurring-tasks
**Tasks that repeat across events or on schedule**
- Scope: M
- Touches: schema, api, ui
- Depends on: none
- Done when:
  - `task_recurrence` table: task_id, frequency (daily/weekly/monthly), next_due, end_date
  - Cron generates task instances from recurrence rules
  - UI for setting recurrence on task creation
  - Recurring task management page
- Notes: Useful for maintenance tasks (equipment cleaning, inventory checks) that aren't event-specific.

### mobile-app
**Mobile-responsive improvements for field use**
- Scope: L
- Touches: ui
- Depends on: none
- Done when:
  - All dashboard pages render correctly on mobile viewport
  - Touch-friendly interactions (larger tap targets, swipe gestures)
  - Offline-capable task checklist (service worker + local storage)
  - Camera integration for document upload from phone
- Notes: Current UI is responsive but not mobile-optimized. Field staff (servers, chefs) need quick task access on phones during events.

---

## Tech Debt & Code Hygiene

### ~~secure-cron-endpoints~~ ✅ DONE (2026-04-01)
**Add authentication to `/api/cron/*` routes**
- Priority: P1
- Scope: S
- Touches: api

### ~~fix-non-null-assertions~~ ✅ DONE (2026-04-01)
**Replace unsafe `!` assertions with proper guards in production code**
- Priority: P1
- Scope: S
- Touches: api

### ~~optimize-analytics-queries~~ ✅ DONE (2026-04-01)
**Replace N+1 patterns in analytics router with batch queries**
- Priority: P2
- Scope: S
- Touches: api
- Implemented: resourceUtilization uses single batch query for all schedule entries instead of per-resource Promise.all. eventProfitability uses 2 aggregate queries (invoices + expenses grouped by event_id) instead of 2N per-event queries.

### ~~eliminate-raw-sql-type-casts~~ ✅ DONE (2026-04-01)
**Replace `as unknown as` casts with typed Drizzle queries**
- Priority: P2
- Scope: S
- Touches: api
- Implemented: payment.ts uses Drizzle `sum()` aggregation. invoice-number.ts uses typed `db.select()` with `like()` and `desc()`. Zero `as unknown as` casts remain in production code.

### ~~component-test-coverage~~ ✅ DONE (2026-04-02)
**Add unit tests for critical untested components**
- Priority: P2
- Scope: L
- Touches: ui
- Implemented: Added 23 new component test files (6 forms, 4 dialogs, 8 badges/display, 5 lists). Coverage rose from 34% (29/86) to 60.5% (52/86). 357 new test cases covering rendering, user interactions, validation, pending/error states, and edge cases. All priority components tested: TaskForm, ClientForm, InvoiceForm, ResourceForm, ExpenseForm, CommunicationForm, RecordPaymentDialog, AddMenuItemDialog, ImportDialog, BatchStatusDialog.

### ~~add-updated-at-triggers~~ ✅ DONE (2026-04-01)
**Create database triggers to auto-update `updated_at` on all mutable tables**
- Priority: P2
- Scope: S
- Touches: schema
- Implemented: Generic `update_updated_at_column()` PL/pgSQL function with BEFORE UPDATE triggers on all 19 mutable tables. Migration 0013.

### ~~add-missing-fk-indexes~~ ✅ DONE (2026-04-01)
**Add database indexes on unindexed foreign key columns**
- Priority: P2
- Scope: S
- Touches: schema
- Implemented: 9 indexes added for FK columns referencing users.id (communications.contacted_by, events.archived_by/created_by, documents.uploaded_by, expenses.created_by, invoices.created_by, menu_items.created_by, payments.recorded_by, event_status_log.changed_by). Migration 0013.

### ~~ci-pipeline-optimization~~ ✅ DONE (2026-04-01)
**Reduce CI build time by eliminating redundant work**
- Priority: P2
- Scope: M
- Touches: infra
- Implemented: Go binary built once in dedicated `build-go` job and shared as artifact to e2e-tests/quality-gates (eliminates 2 redundant builds). Playwright browsers cached via actions/cache@v4 keyed on version. Go setup removed from `build` job.

### ~~lazy-load-heavy-dependencies~~ ✅ DONE (2026-04-02)
**Dynamic import chart.js, @dnd-kit, and @supabase/supabase-js**
- Priority: P3
- Scope: S
- Touches: ui
- Implemented: Chart components lazy-loaded via `next/dynamic` with `ssr: false` on analytics page. SchedulingCalendar lazy-loaded on scheduling page. Supabase already isolated in server-only `storage.ts`.

### ~~extract-large-components~~ ✅ DONE (2026-04-02)
**Break down components >300 LOC into focused sub-components**
- Priority: P3
- Scope: M
- Touches: ui
- Implemented: ResourceAssignmentDialog 424→196 (3 sub-components). EventForm 347→148 (EventFormFields). UploadDocumentDialog 318→195 (FileUploadZone). SchedulingCalendar 299→194 (SchedulingToolbar). TaskForm 299→231 (TaskFormFields). All existing tests pass.

### ~~env-documentation-sync~~ ✅ DONE (2026-04-02)
**Document undocumented env vars and wire up missing config**
- Priority: P3
- Scope: S
- Touches: docs, api, go-service
- Implemented: Fixed ENV.md naming (CORS_ALLOWED_ORIGINS → ALLOWED_ORIGINS). Added LOG_LEVEL filtering to Go logger. Replaced `log.Printf` with structured logger in middleware and main. Documented rate limit difference. Removed unused REDIS_URL, added NODE_ENV.

### ~~go-structured-logging~~ ✅ DONE (2026-04-02)
**Replace `log.Printf` with structured logger in Go service**
- Priority: P4
- Scope: S
- Touches: go-service
- Implemented: middleware.go and main.go now use `internal/logger` package. Logger reads LOG_LEVEL from env with level filtering. Rate limit warning uses structured JSON output.

### ~~enable-biome-a11y~~ ✅ DONE (2026-04-02)
**Enable Biome accessibility linting rules**
- Priority: P4
- Scope: S
- Touches: ui
- Implemented: `a11y.recommended: true` in biome.json. Fixed 206 violations across 8 rules: 92 useButtonType (added `type="button"`), 63 noSvgWithoutTitle (added `aria-hidden="true"`), 30 noLabelWithoutControl (htmlFor/id pairs or semantic fix), 11 useAriaPropsSupportedByRole, 5 noStaticElementInteractions, 2 useSemanticElements, 2 useKeyWithClickEvents, 1 noRedundantRoles. 3 biome-ignore suppressions with justification (dnd-kit draggable, drop zone, test wrapper).

---

## Infrastructure

| Priority | Item | Description | Scope |
|----------|------|-------------|-------|
| ~~High~~ | ~~**Automate Go service deployment**~~ | ~~Add Fly.io deployment to CI pipeline~~ — deploy-go-production job in CI | ✅ Done |
| ~~High~~ | ~~**Security scanning**~~ | ~~Integrate Snyk or Dependabot~~ — Dependabot configured (npm + gomod, weekly) | ✅ Done |
| ~~High~~ | ~~**Container registry**~~ | ~~Publish Docker images to GHCR~~ — publish-images job in CI on main push | ✅ Done |
| Medium | **Distributed Turbo caching** | Remote cache for faster CI builds | S |
| Medium | **APM integration** | Sentry for error tracking and performance monitoring | M |
| Medium | **Database backup automation** | Formalize Supabase backup policy and verification | S |
| Low | **Blue-green deployments** | Zero-downtime updates for production | L |

---

## Archive

### Completed

| Date | Item | Notes |
|------|------|-------|
| 2026-04-02 | Biome a11y linting | Enabled `a11y.recommended: true`, fixed 206 violations (8 rules) across ~50 files, 3 justified suppressions |
| 2026-04-02 | P3 tech debt batch | Lazy-load chart.js + @dnd-kit via next/dynamic, extract 5 large components (10 new sub-components), env docs sync + Go structured logging |
| 2026-04-02 | Component test coverage | 23 new test files, 357 new tests, coverage 34% → 60.5% (52/86 components). Forms, dialogs, badges, lists. |
| 2026-04-01 | P2 tech debt batch | Analytics N+1 → batch queries, type casts → Drizzle typed, updated_at triggers (19 tables), FK indexes (9 columns), CI optimization (Go artifact sharing, Playwright cache) |
| 2026-04-01 | Dependency upgrades | TypeScript 6, batch minor/patch npm updates, Go module security updates, remove deprecated @types/bcryptjs |
| 2026-04-01 | Staff skills | Skills matrix (10 types), weekly availability, user↔resource bridge, findAvailable query, staff pages |
| 2026-03-18 | Document management | File uploads via Supabase Storage with presigned URLs, client portal sharing, drag-and-drop UI |
| 2026-03-16 | Financial layer | Expenses, invoicing with PDF, payments with auto-status transitions, profitability analytics |
| 2026-03-30 | Notification system | In-app notifications (bell icon, preferences), email digests via Resend, 6 procedures, migrations 0009–0010 |
| 2026-03-19 | Menu planning | Global catalog, per-event menus, dietary tracking, cost estimation, shopping lists, 15+1 procedures, migration 0007 |
| 2026-03-15 | Enable RLS on all 25 tables | Deny-all RLS across all tables (migrations 0005, 0008, 0010); blocks Supabase REST API, app unaffected |
| 2026-03-15 | Gantt chart | Visual task timeline with dependency arrows, critical path, status-colored bars |
| 2026-02-28 | Advanced search | Full-text ILIKE search across events, clients, tasks, resources |
| 2026-02-09 | Event cloning | Deep-copy events with task dependency remapping |
| 2026-02-03 | Task templates | Auto-generate tasks from predefined templates |
| 2026-02-02 | Automated database migrations | CI runs migrations before deployment |
| 2026-02-01 | Production deployment | Vercel + Fly.io + Supabase |
| 2026-01-30 | Session management | Auto-refresh with expiration handling |
| 2026-01-28 | E2E test coverage | Playwright tests for critical flows |
| 2026-01-26 | Security hardening | Rate limiting, CSRF, security headers |

### Rejected

| Date | Item | Reason |
|------|------|--------|
| - | - | - |
