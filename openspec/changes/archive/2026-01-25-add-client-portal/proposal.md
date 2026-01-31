# Proposal: Add Client Portal Access

**Change ID**: `add-client-portal`
**Status**: Draft
**Created**: 2026-01-25

## Summary

Enable catering clients to access a read-only portal where they can view their event progress, task status, and communication history. Clients authenticate via magic link email (passwordless) and see only their own events through dedicated `/portal` routes.

## Motivation

The original specification noted: *"In the future the client will also be able to access data to track progress before event or request changes."* This proposal implements the first phase: **read-only client access**.

**Benefits**:
- Reduces staff time spent on "what's the status?" calls
- Improves client satisfaction through transparency
- Provides audit trail of client portal access
- Foundation for future client self-service features

## Scope

### In Scope
- Magic link email authentication for clients
- Dedicated `/portal` routes with client-specific layout
- View-only access to:
  - Event details (date, location, status)
  - Event progress timeline (status history)
  - Task list with completion status
  - Communication history
- Client-scoped data access (see only own events)
- Portal access logging for audit

### Out of Scope
- Client-initiated changes or requests (future phase)
- Real-time notifications/SSE for clients
- Mobile app or PWA features
- Multi-client company accounts

## Design Decisions

See [design.md](./design.md) for architectural details.

**Key decisions**:
1. **Auth**: Extend Next-Auth with magic link provider, add `client` role to user enum
2. **Data model**: Link clients to users via `client_id` foreign key on users table
3. **Routes**: `/portal/*` with dedicated layout (no sidebar navigation)
4. **API**: New `portal.*` tRPC router with client-scoped procedures

## Affected Specs

| Spec | Change Type | Description |
|------|-------------|-------------|
| `client-portal` (new) | Added | 6 requirements for client portal access |

## Dependencies

- `client-communication` spec (FR-021, FR-022 provide data to display)
- Next-Auth v5 (already installed, supports magic link)
- Resend or similar email provider for magic links

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Magic link emails marked as spam | Use reputable email service, add SPF/DKIM records |
| Client accesses wrong event data | Row-level filtering in all portal procedures |
| Increased database load | Add indexes on client_id lookups |

## Success Criteria

- Clients can log in via magic link within 30 seconds
- Portal loads event data in <2 seconds
- Zero cross-client data leakage (enforced by tests)
- Staff can enable/disable client portal access per client
