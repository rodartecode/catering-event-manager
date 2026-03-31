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

### staff-skills
**Staff skills matrix and shift availability**
- Scope: M
- Touches: schema, api, ui
- Depends on: none
- Done when:
  - `staff_skills` junction: user_id, skill (food_safety_cert/bartender/sommelier/lead_chef/etc)
  - `staff_availability` table: user_id, day_of_week, start_time, end_time, is_recurring
  - tRPC: `staff.updateSkills`, `staff.getAvailability`, `staff.setAvailability`, `staff.findAvailable` (filters by skill + time range)
  - Staff profile page shows skills and weekly availability
  - Task assignment dialog suggests staff matching required skills + availability
- Notes: Current `resources` table has `type: staff` but no concept of skills or shift availability. This extends the existing resource system. Feeds into Go scheduler's conflict detection.

### bulk-operations
**Import/export events, batch status updates**
- Scope: M
- Touches: api, ui
- Depends on: none
- Done when:
  - CSV export for events, clients, tasks, resources (server-side generation)
  - CSV import for events and clients with validation and error reporting
  - Batch status update UI: select multiple events/tasks, apply status change
  - tRPC: `event.exportCsv`, `event.importCsv`, `event.batchUpdateStatus`; same pattern for tasks
- Notes: Essential for onboarding (importing existing client/event data) and reporting (export to Excel/Google Sheets).

### ~~gantt-chart~~ ✅ DONE (2026-03-15)
**Visual timeline of task dependencies**
- Scope: M
- Touches: ui
- Implemented: Gantt chart component on event detail page with task bars colored by status, dependency arrows, critical path highlighting, and horizontal scroll for long timelines.

### drag-drop-scheduling
**Visual calendar-based resource assignment**
- Scope: L
- Touches: ui, api
- Depends on: none
- Done when:
  - Calendar view showing resource schedules (day/week/month)
  - Drag to create new schedule blocks
  - Drag to move/resize existing blocks
  - Conflict detection on drop (calls Go service)
  - Resource filter sidebar (by type, availability)
- Notes: High UX impact. The Go scheduler already handles conflict detection — this adds the visual interaction layer. Consider react-big-calendar or @dnd-kit.

---

## P3 — Domain Differentiators

### kitchen-production
**Kitchen production scheduling and station allocation**
- Scope: L
- Touches: schema, api, ui, go-service
- Depends on: `menu-planning`
- Done when:
  - `kitchen_stations` table: name, type (oven/grill/prep_counter/cold_storage), capacity
  - `production_tasks` table: menu_item_id, event_id, station_id, start_time, duration, prep_type (marinate/bake/plate/etc)
  - Production timeline view: work backwards from event time (e.g., "marinate 24h before", "bake 4h before")
  - Station conflict detection via Go scheduler (stations as schedulable resources)
  - Auto-generate production tasks from menu items (each dish = set of prep steps)
- Notes: Extends task templates — menu-driven production templates. This is what separates professional catering software from generic PM tools. Start with manual production task creation, then add auto-generation.

### venue-database
**Venue profiles with logistics intelligence**
- Scope: M
- Touches: schema, api, ui
- Depends on: none
- Done when:
  - `venues` table: name, address, capacity, has_kitchen, kitchen_type, equipment_available (array), parking_notes, load_in_notes, contact_info
  - `events.venue_id` FK replaces free-text `location` field (keep `location` as fallback for ad-hoc venues)
  - tRPC: `venue.create`, `venue.list`, `venue.getById`, `venue.update`
  - Event creation: select venue from database, auto-populate logistics notes
  - Equipment checklist per venue ("this venue has no oven — add portable oven to resources")
- Notes: `events.location` is currently a text field. Venue profiles enable reuse and logistics planning. Travel time between venues (for same-day multi-event allocation) is a v2 enhancement.

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

## Infrastructure

| Priority | Item | Description | Scope |
|----------|------|-------------|-------|
| High | **Automate Go service deployment** | Add Fly.io deployment to CI pipeline (currently manual) | M |
| ~~High~~ | ~~**Security scanning**~~ | ~~Integrate Snyk or Dependabot~~ — Dependabot configured (npm + gomod, weekly) | ✅ Done |
| High | **Container registry** | Publish Docker images to GHCR for versioned deployments | M |
| Medium | **Distributed Turbo caching** | Remote cache for faster CI builds | S |
| Medium | **APM integration** | Sentry for error tracking and performance monitoring | M |
| Medium | **Database backup automation** | Formalize Supabase backup policy and verification | S |
| Low | **Blue-green deployments** | Zero-downtime updates for production | L |

---

## Archive

### Completed

| Date | Item | Notes |
|------|------|-------|
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
