# Tasks: Add Client Portal Access

## Overview

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1. Database Schema | T165-T169 | User role extension, client linking |
| 2. Authentication | T170-T175 | Magic link provider, session handling |
| 3. tRPC Router | T176-T182 | Portal procedures with client scoping |
| 4. Portal Pages | T183-T190 | Login, dashboard, event views |
| 5. Staff Management | T191-T195 | Enable/disable portal access |
| 6. Testing | T196-T200 | Unit, integration, E2E tests |

---

## Phase 1: Database Schema (T165-T169)

### T165: Extend user_role enum to include 'client'
- [ ] Add migration to extend `user_role` enum with 'client' value
- [ ] Run `pnpm db:generate` and `pnpm db:push`
- [ ] Verify: `SELECT enum_range(NULL::user_role)` includes 'client'

### T166: Add client_id foreign key to users table
- [ ] Add `client_id` column to users schema (nullable integer, references clients.id)
- [ ] Add database index on `users.client_id`
- [ ] Update TypeScript types in `packages/database/src/schema/users.ts`
- [ ] Verify: Users table has client_id column

### T167: Add portal_enabled flag to clients table
- [ ] Add `portal_enabled` boolean column (default false) to clients schema
- [ ] Add `portal_enabled_at` timestamp column (nullable)
- [ ] Update `packages/database/src/schema/clients.ts`
- [ ] Verify: Clients table has portal_enabled column

### T168: Create verification_tokens table for magic links
- [ ] Add Next-Auth verification_tokens table schema
- [ ] Fields: identifier, token, expires (composite primary key)
- [ ] Run migration
- [ ] Verify: Table exists with correct structure

### T169: Create portal_access_log table for audit
- [ ] Create `portal_access_log` table schema
- [ ] Fields: id, user_id, client_id, action, resource_type, resource_id, timestamp, ip_address
- [ ] Add indexes on user_id, client_id, timestamp
- [ ] Verify: Table exists with indexes

**Parallel work**: T165-T167 can be done in parallel

---

## Phase 2: Authentication (T170-T175)

### T170: Install and configure email provider
- [ ] Add Resend (or similar) to dependencies
- [ ] Create `EMAIL_SERVER` and `EMAIL_FROM` environment variables
- [ ] Add to `.env.example`
- [ ] Verify: Environment variables documented

### T171: Configure Next-Auth EmailProvider for magic links
- [ ] Add EmailProvider to auth configuration
- [ ] Configure 15-minute token expiry
- [ ] Add custom magic link email template
- [ ] Verify: Magic link configuration compiles

### T172: Update Next-Auth session callback for client role
- [ ] Extend session to include `clientId` when role is 'client'
- [ ] Update session type definitions
- [ ] Verify: TypeScript types include clientId

### T173: Add signIn callback to restrict magic links to clients
- [ ] Only allow EmailProvider login for users with role='client'
- [ ] Return error for non-client users attempting magic link
- [ ] Verify: Staff cannot use magic link login

### T174: Create clientProcedure middleware for tRPC
- [ ] Add `clientProcedure` to `apps/web/src/server/trpc.ts`
- [ ] Enforce role='client' check
- [ ] Extract clientId into context
- [ ] Throw FORBIDDEN for non-client access
- [ ] Verify: Middleware rejects non-client users

### T175: Write unit tests for auth middleware
- [ ] Test clientProcedure rejects unauthenticated users
- [ ] Test clientProcedure rejects non-client roles
- [ ] Test clientProcedure passes clientId to context
- [ ] Verify: `pnpm test trpc.test.ts` passes

**Dependencies**: T170 → T171 → T172, T173 (parallel) → T174 → T175

---

## Phase 3: tRPC Router (T176-T182)

### T176: Create portal router scaffold
- [ ] Create `apps/web/src/server/routers/portal.ts`
- [ ] Register in `_app.ts` router
- [ ] Export empty router with clientProcedure
- [ ] Verify: Type-check passes

### T177: Implement portal.getSummary procedure
- [ ] Return client's active events count
- [ ] Return list of event summaries (id, name, date, status)
- [ ] Filter by clientId from context
- [ ] Verify: Returns only client's own events

### T178: Implement portal.listEvents procedure
- [ ] Return paginated list of client's events
- [ ] Support status filter (optional)
- [ ] Include is_archived filter (default: exclude archived)
- [ ] Verify: Pagination works correctly

### T179: Implement portal.getEvent procedure
- [ ] Accept eventId input
- [ ] Verify event belongs to client (ownership check)
- [ ] Return full event details
- [ ] Throw NOT_FOUND for non-owned events
- [ ] Verify: Cannot access other clients' events

### T180: Implement portal.getEventTimeline procedure
- [ ] Accept eventId input
- [ ] Return status history from event_status_log
- [ ] Include previous_status, new_status, changed_at
- [ ] Exclude internal fields (changed_by user details)
- [ ] Verify: Returns chronological status changes

### T181: Implement portal.getEventTasks procedure
- [ ] Accept eventId input
- [ ] Return tasks for event (client-visible fields only)
- [ ] Include: title, status, due_date, category
- [ ] Exclude: internal notes, assigned_to details
- [ ] Calculate overdue flag
- [ ] Verify: Returns sanitized task list

### T182: Implement portal.getEventCommunications procedure
- [ ] Accept eventId input
- [ ] Return communications for event
- [ ] Include: date, type, subject, summary (not internal notes)
- [ ] Order by date descending (newest first)
- [ ] Verify: Returns communication history

**Dependencies**: T176 → T177-T182 (can be parallelized after scaffold)

---

## Phase 4: Portal Pages (T183-T190)

### T183: Create portal route group and layout
- [ ] Create `apps/web/src/app/(portal)/layout.tsx`
- [ ] Simple header with company logo placeholder
- [ ] Logout button (no sidebar navigation)
- [ ] Client-friendly styling
- [ ] Verify: Layout renders without sidebar

### T184: Create portal login page
- [ ] Create `apps/web/src/app/(portal)/login/page.tsx`
- [ ] Email input form
- [ ] "Send Login Link" button
- [ ] Success state: "Check your email"
- [ ] Error handling for invalid emails
- [ ] Verify: Can submit email for magic link

### T185: Create portal dashboard page
- [ ] Create `apps/web/src/app/(portal)/page.tsx`
- [ ] Welcome message with contact name
- [ ] Active events count
- [ ] Event cards grid
- [ ] Empty state for no events
- [ ] Verify: Shows client's events

### T186: Create PortalEventCard component
- [ ] Create `apps/web/src/components/portal/PortalEventCard.tsx`
- [ ] Display: event name, date, status badge
- [ ] "View Details" link
- [ ] Verify: Card displays event info

### T187: Create portal events list page
- [ ] Create `apps/web/src/app/(portal)/events/page.tsx`
- [ ] List all client events with cards
- [ ] Status filter (optional)
- [ ] Link back to dashboard
- [ ] Verify: Lists events with pagination

### T188: Create portal event detail page
- [ ] Create `apps/web/src/app/(portal)/events/[id]/page.tsx`
- [ ] Event header with name, date, location, status
- [ ] Back button
- [ ] Verify: Shows event details

### T189: Create PortalEventTimeline component
- [ ] Create `apps/web/src/components/portal/PortalEventTimeline.tsx`
- [ ] Visual timeline of status changes
- [ ] Highlight current status
- [ ] Verify: Timeline renders chronologically

### T190: Add tasks and communications sections to event detail
- [ ] Create PortalTaskList component (view-only)
- [ ] Create PortalCommunicationsList component
- [ ] Integrate into event detail page
- [ ] Verify: Tasks and communications display correctly

**Dependencies**: T183 → T184 → T185-T190 (pages can be parallelized after layout)

---

## Phase 5: Staff Management (T191-T195)

### T191: Add portal access toggle to client detail page
- [ ] Add "Portal Access" section to client detail
- [ ] Show current status (enabled/disabled)
- [ ] "Enable" button with email input
- [ ] "Disable" button with confirmation
- [ ] Verify: UI displays portal status

### T192: Implement clients.enablePortalAccess mutation
- [ ] Accept clientId and contactEmail
- [ ] Create user with role='client', client_id=clientId
- [ ] Set client.portal_enabled=true
- [ ] Return success/error
- [ ] Verify: Creates client user account

### T193: Implement clients.disablePortalAccess mutation
- [ ] Accept clientId
- [ ] Deactivate user (is_active=false)
- [ ] Set client.portal_enabled=false
- [ ] Invalidate sessions (optional)
- [ ] Verify: Disables portal access

### T194: Add portal status indicator to clients list
- [ ] Show badge/icon for portal-enabled clients
- [ ] Optionally show last portal access date
- [ ] Verify: Visual indicator in list

### T195: Send welcome email when portal enabled
- [ ] Create welcome email template
- [ ] Include magic link or instructions
- [ ] Send on portal enable (optional flag)
- [ ] Verify: Email sent with correct content

**Dependencies**: T192, T193 can be parallel; T195 depends on T170

---

## Phase 6: Testing (T196-T200)

### T196: Write portal router unit tests
- [ ] Test all portal procedures
- [ ] Test ownership checks (cross-client isolation)
- [ ] Test error handling
- [ ] Verify: `pnpm test portal.test.ts` passes

### T197: Write portal component tests
- [ ] Test PortalEventCard rendering
- [ ] Test PortalEventTimeline with various states
- [ ] Test login form validation
- [ ] Verify: Component tests pass

### T198: Write integration tests for portal auth flow
- [ ] Test magic link request
- [ ] Test valid token login
- [ ] Test expired token rejection
- [ ] Test session includes clientId
- [ ] Verify: Auth flow integration tests pass

### T199: Write E2E test for portal workflow
- [ ] Test full login journey (magic link simulation)
- [ ] Test viewing event details
- [ ] Test navigation between pages
- [ ] Verify: `pnpm test:e2e portal` passes

### T200: Write security tests for data isolation
- [ ] Test client cannot access other client's events
- [ ] Test client cannot access staff-only endpoints
- [ ] Test disabled portal user cannot login
- [ ] Verify: Security tests pass

**Dependencies**: T196-T200 depend on implementation phases being complete

---

## Verification Checklist

- [ ] Database migrations run without errors
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E portal workflow test passes
- [ ] Cross-client data isolation verified
- [ ] Magic link login works end-to-end
- [ ] Staff can enable/disable portal access
- [ ] Portal pages render correctly on mobile
