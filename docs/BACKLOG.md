# Feature Backlog

A curated backlog of potential features and improvements for the catering event manager. Ideas to draw from without committing to specific timelines.

**How to use this document:**
- Items are organized by category with checkboxes for tracking consideration status
- Check items when actively working on them or when decided against
- Move completed items to the Archive section with implementation date
- Move rejected items to Archive with reason

---

## Infrastructure & DevOps

| Priority | Status | Item | Description |
|----------|--------|------|-------------|
| High | | **Automate Go service deployment** | Currently manual; add Fly.io deployment to CI pipeline |
| High | | **Staging environment** | Add staging branch with dedicated Vercel deployment |
| High | | **Security scanning** | Integrate Snyk or Dependabot for vulnerability scanning |
| High | | **Container registry** | Publish Docker images to GHCR for versioned deployments |
| Medium | | **Distributed Turbo caching** | Remote cache for faster CI builds |
| Medium | | **APM integration** | Sentry for error tracking and performance monitoring |
| Medium | | **Database backup automation** | Formalize Supabase backup policy and verification |
| Low | | **Blue-green deployments** | Zero-downtime updates for production |

## Feature Enhancements

### Scheduling & Resources

- [ ] **Multi-event resource pooling** - Optimize resource allocation across concurrent events
- [ ] **Advanced scheduling algorithms** - Critical path analysis, resource leveling
- [ ] **Drag-and-drop scheduling UI** - Visual calendar-based resource assignment
- [ ] **Resource templates** - Predefined resource sets for event types

### Event Management

- [ ] **Event cloning** - Clone existing event configurations as templates
- [ ] **Bulk operations** - Import/export events, batch status updates
- [ ] **Document management** - Attach contracts, menus, floor plans to events
- [ ] **Event checklists** - Custom verification checklists per event type

### Task Management

- [x] **Task templates** - Auto-generate tasks from event type (implemented 2026-02-03)
- [ ] **Gantt chart view** - Visual timeline of task dependencies
- [ ] **Time tracking** - Log actual time spent on tasks
- [ ] **Recurring tasks** - Tasks that repeat across events or on schedule

### Communication

- [ ] **Configurable email notifications** - User-customizable notification preferences
- [ ] **Email templates** - Branded templates for client communication
- [ ] **SMS notifications** - Text alerts for urgent items
- [ ] **In-app notification center** - Centralized notification management

## Business Features

### Financial

- [ ] **Invoicing** - Generate and track invoices per event
- [ ] **Payment tracking** - Record payments, outstanding balances
- [ ] **Cost tracking** - Track expenses per event for profitability
- [ ] **Profit margin calculations** - Automated P&L per event

### Vendor Management

- [ ] **Vendor database** - Manage external vendors and suppliers
- [ ] **Vendor assignments** - Assign vendors to events/tasks
- [ ] **Vendor portal** - Limited access for vendor task management

### Multi-Tenancy

- [ ] **Organization accounts** - Multiple users under one organization
- [ ] **White-label portal** - Custom branding for client portal
- [ ] **Custom role permissions** - Granular permission configuration

## User Experience

- [ ] **Mobile-responsive improvements** - Better mobile layouts for field use
- [ ] **Dark mode** - System/user preference dark theme
- [ ] **Keyboard shortcuts** - Power user navigation
- [ ] **Advanced search** - Full-text search across all entities
- [ ] **Customizable dashboard** - User-configurable dashboard widgets
- [ ] **WebSocket updates** - Replace SSE with WebSocket for real-time
- [ ] **Collaborative editing** - Multiple users editing same entity
- [ ] **Presence indicators** - Show who's viewing/editing
- [ ] **Activity feed** - Recent activity across the system

## AI & Automation

- [ ] **Resource suggestions** - AI recommends resources based on event type
- [ ] **Conflict resolution alternatives** - Suggest alternative resources on conflict
- [ ] **Prep time predictions** - ML-based task duration estimates
- [ ] **Smart scheduling** - Auto-schedule based on skills/availability
- [ ] **Natural language event creation** - Create events from text description

## Analytics & Reporting

- [ ] **Custom report builder** - User-defined report configurations
- [ ] **Trend analysis** - Historical performance trends
- [ ] **Forecasting** - Predict busy periods and resource needs
- [ ] **Export options** - PDF, Excel export for all reports
- [ ] **Client lifetime value** - Track revenue per client over time
- [ ] **Event type comparison** - Compare performance across event types
- [ ] **Staff performance metrics** - Task completion rates by assignee

---

## Archive

### Completed

| Date | Item | Notes |
|------|------|-------|
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
