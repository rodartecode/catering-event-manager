# Tasks: add-client-communication

## Overview

19 tasks implementing Client Communication Management (User Story 5, Priority P5).

## Prerequisites

- [x] Phase 1-6 complete (database, auth, events, tasks, resources, analytics)
- [x] Clients table exists with contact information
- [x] Communication type enum already defined

---

## Section 1: Database Schema (T146-T148)

### T146: Define communications table with all fields
**Priority**: P0 (blocking)
**File**: `packages/database/src/schema/communications.ts`

- [x] Complete

Add complete table definition with fields:
- id, eventId, clientId (foreign keys)
- type (uses existing enum)
- subject, notes
- contactedAt, contactedBy
- followUpDate, followUpCompleted
- createdAt, updatedAt

**Acceptance**: Schema compiles without errors.

---

### T147: Add indexes for communications table
**Priority**: P1
**File**: `packages/database/src/schema/communications.ts`

- [x] Complete

Add indexes for:
- `idx_communications_event_id` - Event detail page queries
- `idx_communications_client_id` - Client history queries
- `idx_communications_follow_up_date` - Follow-up queries
- `idx_communications_contacted_at` - Chronological queries

**Acceptance**: Indexes defined in schema, push succeeds.

---

### T148: Export communications from schema index
**Priority**: P0 (blocking)
**File**: `packages/database/src/schema/index.ts`

- [x] Complete

Ensure communications table and enum are exported. Already exports from communications.ts but may need update after table addition.

**Acceptance**: `import { communications } from '@catering-event-manager/database/schema'` works.

---

## Section 2: Backend tRPC (T149-T153)

### T149: Add recordCommunication mutation
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/clients.ts`
**Spec**: FR-022

- [x] Complete

Add adminProcedure mutation:
- Input: eventId, clientId, type, subject?, notes?, contactedAt?, followUpDate?
- Validates event and client exist
- Returns created communication record

**Acceptance**: Can create communication via tRPC playground.

---

### T150: Add listCommunications query
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/clients.ts`

- [x] Complete

Add protectedProcedure query:
- Input: clientId, optional pagination (limit, offset)
- Returns communications with event info, ordered by contactedAt DESC
- Include related event name and contactedBy user name

**Acceptance**: Returns paginated communication history.

---

### T151: Add scheduleFollowUp mutation
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/clients.ts`
**Spec**: FR-023

- [x] Complete

Add adminProcedure mutation:
- Input: communicationId, followUpDate
- Updates existing communication with follow-up date
- Returns updated record

**Acceptance**: Can set follow-up date on existing communication.

---

### T152: Add completeFollowUp mutation
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/clients.ts`

- [x] Complete

Add protectedProcedure mutation:
- Input: communicationId
- Sets followUpCompleted = true
- Returns updated record

**Acceptance**: Can mark follow-up as complete.

---

### T153: Add getDueFollowUps query
**Priority**: P0 (blocking)
**File**: `apps/web/src/server/routers/clients.ts`

- [x] Complete

Add protectedProcedure query:
- No required input
- Returns communications where followUpDate <= today AND followUpCompleted = false
- Include client name, event name, days overdue

**Acceptance**: Returns list of pending follow-ups.

---

## Section 3: Frontend Pages (T154-T157)

### T154: Create clients list page
**Priority**: P0 (blocking)
**File**: `apps/web/src/app/(dashboard)/clients/page.tsx`

- [x] Complete

Create page with:
- Title and description
- Search input filtering by company/contact name
- Grid of ClientCard components
- Link to create new client (if admin)
- FollowUpBanner integration

**Acceptance**: Page loads at `/clients` with search working.

---

### T155: Create client detail page
**Priority**: P0 (blocking)
**File**: `apps/web/src/app/(dashboard)/clients/[id]/page.tsx`

- [x] Complete

Create page with tabs:
- **Info tab**: Contact details, edit button (admin)
- **Events tab**: List of events for this client
- **Communications tab**: Communication history with record form

**Acceptance**: Page loads at `/clients/[id]` with all tabs working.

---

### T156: Integrate communication form in client detail
**Priority**: P0 (blocking)
**File**: `apps/web/src/app/(dashboard)/clients/[id]/page.tsx`

- [x] Complete

In Communications tab:
- CommunicationForm component at top
- CommunicationList below showing history
- Refresh list after recording

**Acceptance**: Can record and immediately see communication in list.

---

### T157: Add follow-up indicator to dashboard
**Priority**: P1
**File**: `apps/web/src/app/(dashboard)/page.tsx` or layout

- [x] Complete

Add notification banner showing:
- Count of due/overdue follow-ups
- Link to follow-ups list
- Dismissible per session

**Acceptance**: Dashboard shows follow-up count when applicable.

---

## Section 4: Frontend Components (T158-T162)

### T158: Create ClientCard component
**Priority**: P0 (blocking)
**File**: `apps/web/src/components/clients/ClientCard.tsx`

- [x] Complete

Display:
- Company name (heading)
- Contact name
- Email and phone
- Events count badge
- Link to detail page

**Acceptance**: Card renders correctly in clients list.

---

### T159: Create CommunicationList component
**Priority**: P0 (blocking)
**File**: `apps/web/src/components/clients/CommunicationList.tsx`

- [x] Complete

Display chronological list with:
- Type icon (email/phone/meeting/other)
- Subject and notes preview
- Date contacted
- Follow-up indicator if scheduled
- Expand/collapse for full notes
- Complete follow-up button

**Acceptance**: List renders with proper styling and interactions.

---

### T160: Create CommunicationForm component
**Priority**: P0 (blocking)
**File**: `apps/web/src/components/clients/CommunicationForm.tsx`

- [x] Complete

Form with:
- Event select dropdown (events for this client)
- Type select (email/phone/meeting/other)
- Subject input
- Notes textarea
- Contacted at date/time
- Optional follow-up date
- Submit button

**Acceptance**: Form validates and submits correctly.

---

### T161: Create FollowUpIndicator component
**Priority**: P1
**File**: `apps/web/src/components/clients/FollowUpIndicator.tsx`

- [x] Complete

Badge component showing:
- Due today: yellow
- Overdue: red with days count
- Completed: green checkmark
- None: no indicator
- Future: blue with date

**Acceptance**: Correct styling based on follow-up state.

---

### T162: Create FollowUpBanner component
**Priority**: P1
**File**: `apps/web/src/components/clients/FollowUpBanner.tsx`

- [x] Complete

Dashboard banner with:
- Icon and message about due follow-ups
- Count of due items (overdue vs due today)
- "View All" link to clients with pending follow-ups
- Close/dismiss button

**Acceptance**: Banner shows when follow-ups exist, hides when closed.

---

## Section 5: Notification System (T163-T164)

### T163: Create follow-up cron API route
**Priority**: P2
**File**: `apps/web/src/app/api/cron/follow-ups/route.ts`

- [x] Complete

API route (can be triggered by Vercel cron or manually):
- Query pending follow-ups
- Log count for monitoring
- Return summary with overdue/due today counts

**Acceptance**: Route returns follow-up summary when called.

---

### T164: Add follow-up count to dashboard header
**Priority**: P2
**File**: `apps/web/src/app/(dashboard)/page.tsx`

- [x] Complete

Add subtle indicator:
- StatCard with due follow-ups count
- Links to clients page
- Real-time query with trpc.clients.getDueFollowUps

**Acceptance**: Dashboard shows follow-up count.

---

## Dependency Graph

```
T146 (table definition)
  └── T147 (indexes)
       └── T148 (exports) ─┐
                           │
T149 (recordCommunication) ├── depends on T146
T150 (listCommunications)  │
T151 (scheduleFollowUp)    │
T152 (completeFollowUp)    │
T153 (getDueFollowUps) ────┘

T158 (ClientCard) ──────────┐
T159 (CommunicationList) ───┤
T160 (CommunicationForm) ───┼── T154 (list page)
T161 (FollowUpIndicator) ───┤     └── T155 (detail page)
T162 (FollowUpBanner) ──────┘          └── T156 (integration)
                                            └── T157 (dashboard)

T163 (cron route) ─── standalone (P2)
T164 (header count) ─── depends on T153 (P2)
```

## Verification Checklist

- [x] `pnpm db:push` succeeds with new communications table
- [x] `pnpm type-check` passes
- [x] `pnpm lint` passes
- [x] Clients list page loads at `/clients`
- [x] Client detail page loads at `/clients/[id]`
- [x] Can record a communication with type and notes
- [x] Can schedule a follow-up date
- [x] Can complete a follow-up
- [x] Dashboard shows due follow-ups count
- [x] SC-008: Communication history accessible for events
