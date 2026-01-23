# Proposal: add-client-communication

## Summary

Implement Phase 7 (User Story 5, Priority P5) - Client Communication Management to enable tracking of client interactions, recording communication history, and scheduling follow-up tasks.

## Problem Statement

Currently, catering managers have no systematic way to track client communications. They cannot:
- Record when and how they communicated with clients
- View communication history associated with events
- Schedule and track follow-up tasks
- Ensure no client inquiry falls through the cracks

Without this tracking, client relationships suffer and important follow-ups are missed, potentially losing business opportunities.

## Proposed Solution

Add client communication tracking capabilities:

1. **Communication Recording** (FR-022): Record client communications with date, type (email/phone/meeting), and notes
2. **Follow-Up Scheduling** (FR-023): Schedule follow-up tasks for communications with due dates and completion tracking
3. **Communication History** (FR-021): View complete communication history for any client

## Scope

### In Scope
- Communications database table with full schema
- tRPC procedures for CRUD on communications
- Client list page with search functionality
- Client detail page with communication history
- Follow-up notification system in dashboard
- Communication recording form

### Out of Scope
- Email integration (sending emails from the system)
- SMS/messaging platform integrations
- Automated communication reminders via email
- Communication templates
- Bulk communication features

## Impact Analysis

### New Files
- `apps/web/src/app/(dashboard)/clients/page.tsx` - Client list page
- `apps/web/src/app/(dashboard)/clients/[id]/page.tsx` - Client detail page
- `apps/web/src/components/clients/ClientCard.tsx` - Client display component
- `apps/web/src/components/clients/CommunicationList.tsx` - Communication history
- `apps/web/src/components/clients/CommunicationForm.tsx` - Record communication
- `apps/web/src/components/clients/FollowUpIndicator.tsx` - Follow-up status badge
- `apps/web/src/components/clients/FollowUpBanner.tsx` - Dashboard notification
- `apps/web/src/app/api/cron/follow-ups/route.ts` - Follow-up cron job

### Modified Files
- `packages/database/src/schema/communications.ts` - Add full table definition
- `apps/web/src/server/routers/clients.ts` - Add communication procedures

### Dependencies
- No new npm packages required
- Uses existing Drizzle ORM, tRPC infrastructure

### Breaking Changes
None. This is additive functionality building on existing clients table.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Communication history grows large | Low | Medium | Add pagination to communication list |
| Follow-up notifications missed | Medium | High | Dashboard banner + optional cron job |
| Complex queries on join tables | Low | Low | Proper indexes on event_id, client_id, follow_up_date |

## Success Criteria

- SC-008: Client communication history is complete and accessible for 100% of events
- FR-022: Communications can be recorded with type, date, and notes
- FR-023: Follow-up tasks can be scheduled and tracked

## Verification Plan

1. Run `cd packages/database && pnpm db:push` - Schema applied without errors
2. Run `pnpm type-check` - All types compile
3. Run `pnpm lint` - Code passes linting
4. Manual test: Create client → Record communication → Schedule follow-up
5. Manual test: Complete follow-up → Verify removed from due list

## Related Changes

- **Depends on**: Phase 1-6 complete (database, auth, events, tasks, resources, analytics)
- **Enhances**: Client detail view (existing clients router)
- **Completes**: User Story 5 (P5 priority)
