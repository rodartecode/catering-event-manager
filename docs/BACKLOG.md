# Feature Backlog

A curated list of potential features, improvements, and ideas for the Catering Event Manager. This is a living document for capturing opportunities discovered during development, audits, and user feedback.

## How to Use This Backlog

- **Add ideas freely** - No commitment to implement; this captures possibilities
- **Check the box** when an item moves to active development (spec or tasks.md)
- **Move to Archive** when implemented or explicitly rejected
- **Priority indicators** are suggestions, not mandates

---

## Infrastructure & DevOps

### High Priority

- [ ] **Automate Go service deployment** - Add Fly.io or Railway deployment to CI pipeline; currently manual
- [ ] **Staging environment** - Create staging branch with dedicated Vercel deployment for pre-production testing
- [ ] **Security scanning** - Integrate Snyk or Dependabot for vulnerability detection
- [ ] **Container registry** - Publish Docker images to GitHub Container Registry (GHCR)

### Medium Priority

- [ ] **Distributed Turbo caching** - Enable remote cache for faster CI builds across branches
- [ ] **APM integration** - Add Sentry for error tracking and performance monitoring
- [ ] **Database backup automation** - Formalize and document Supabase backup policy
- [ ] **E2E tests in CI** - Add Playwright tests to deployment pipeline with failure gates

### Low Priority

- [ ] **Blue-green deployments** - Zero-downtime updates for production releases
- [ ] **Load testing** - Establish baseline performance metrics and regression detection
- [ ] **Feature flags** - Runtime feature toggles for gradual rollouts

---

## Feature Enhancements

### Scheduling & Resources

- [ ] **Multi-event resource pooling** - Optimize resource allocation across concurrent events
- [ ] **Advanced scheduling algorithms** - Critical path analysis, resource leveling
- [ ] **Drag-and-drop scheduling UI** - Visual calendar-based resource assignment
- [ ] **Resource templates** - Pre-configured resource sets by event type (wedding, corporate, etc.)
- [ ] **Availability calendars** - Staff/equipment availability with blackout dates

### Event Management

- [ ] **Event templates** - Clone event configurations for recurring event types
- [ ] **Bulk operations** - Import/export events, batch status updates
- [ ] **Document management** - Attach contracts, menus, floor plans to events
- [ ] **Event checklists** - Configurable pre-event and day-of checklists
- [ ] **Event history timeline** - Visual audit trail of all event changes

### Task Management

- [ ] **Task templates** - Auto-generate task lists from event type
- [ ] **Gantt chart view** - Timeline visualization with dependencies
- [ ] **Time tracking** - Log actual time spent on tasks
- [ ] **Recurring tasks** - Scheduled tasks that repeat (weekly prep, monthly inventory)
- [ ] **Task assignments with notifications** - Notify assigned staff of new tasks

### Communication

- [ ] **Configurable email notifications** - User-controlled notification preferences
- [ ] **Email templates** - Branded, customizable email templates
- [ ] **SMS notifications** - Critical alerts via SMS
- [ ] **In-app notification center** - Consolidated notification inbox
- [ ] **Client communication log** - Track all client interactions

---

## Business Features

### Financial

- [ ] **Invoicing** - Generate and send invoices from event details
- [ ] **Payment tracking** - Record deposits, payments, outstanding balances
- [ ] **Cost tracking per event** - Labor, materials, vendor costs
- [ ] **Profit margin calculations** - Revenue minus costs with margin percentages
- [ ] **Financial reporting** - Revenue by period, client, event type

### Vendor Management

- [ ] **Vendor database** - Centralized vendor contact and capability tracking
- [ ] **Vendor assignments** - Assign vendors to events and tasks
- [ ] **Vendor portal** - Limited-access portal for vendor communication
- [ ] **Vendor performance tracking** - Ratings and notes per vendor

### Multi-Tenancy

- [ ] **Organization accounts** - Multiple users under one organization
- [ ] **White-label portal** - Custom branding for enterprise clients
- [ ] **Custom role permissions** - Granular permission configuration
- [ ] **Team management** - Add/remove team members, assign roles

---

## User Experience

### Interface

- [ ] **Mobile-responsive improvements** - Optimize all views for mobile devices
- [ ] **Dark mode** - System-preference-aware dark theme
- [ ] **Keyboard shortcuts** - Power-user navigation and actions
- [ ] **Advanced search** - Full-text search across events, clients, tasks
- [ ] **Customizable dashboard** - Widget-based dashboard configuration

### Real-Time & Collaboration

- [ ] **WebSocket updates** - Replace SSE with WebSocket for real-time sync
- [ ] **Collaborative editing** - Multiple users editing same event
- [ ] **Presence indicators** - Show who's viewing/editing
- [ ] **Activity feed** - Real-time stream of system activity
- [ ] **Comments on events/tasks** - Team communication in context

---

## AI & Automation

- [ ] **Resource suggestions** - Recommend resources based on event type and history
- [ ] **Conflict resolution alternatives** - Suggest alternative slots when conflicts occur
- [ ] **Prep time predictions** - Estimate prep time based on historical data
- [ ] **Auto-task generation** - Create tasks from templates using event parameters
- [ ] **Smart scheduling** - Consider skills, availability, preferences in suggestions
- [ ] **Natural language event creation** - Create events from text descriptions
- [ ] **Anomaly detection** - Flag unusual patterns (double-bookings, missing tasks)

---

## Analytics & Reporting

- [ ] **Custom report builder** - User-defined report parameters
- [ ] **Trend analysis** - Event volume, revenue, resource utilization over time
- [ ] **Forecasting** - Predict busy periods based on historical patterns
- [ ] **Export options** - PDF, Excel, CSV export for all reports
- [ ] **Client lifetime value** - Track total revenue per client
- [ ] **Event type comparison** - Compare metrics across event types
- [ ] **Staff performance metrics** - Tasks completed, time accuracy, ratings
- [ ] **Resource utilization reports** - Identify underutilized resources

---

## Archive

### Completed

<!-- Move items here when implemented -->
<!-- Format: - [x] **Item name** - Implemented in PR #XX (YYYY-MM-DD) -->

### Rejected

<!-- Move items here when explicitly decided against -->
<!-- Format: - **Item name** - Rejected: [reason] (YYYY-MM-DD) -->

---

## Contributing Ideas

When adding items:

1. Choose the appropriate category
2. Use format: `- [ ] **Title** - Brief description of value/scope`
3. Consider adding to High/Medium/Low subsections for prioritized categories
4. Don't duplicate items already in active specs (`specs/*/tasks.md`)

When moving items to active development:

1. Check the box: `- [x] **Title**`
2. Reference the spec or tasks.md where work is tracked
3. Move to Archive > Completed when done
