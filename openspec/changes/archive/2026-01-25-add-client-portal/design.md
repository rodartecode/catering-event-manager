# Design: Client Portal Access

## Overview

This document describes the architectural approach for adding client portal access to the catering event management system.

## Architecture Decisions

### 1. Authentication Model

**Decision**: Extend the existing `user_role` enum to include `client` role, and link client users to the `clients` table via a foreign key.

**Alternatives Considered**:
- **Separate `client_users` table**: Rejected because it duplicates auth logic and complicates Next-Auth configuration
- **Add auth fields to `clients` table**: Rejected because clients are companies, not individual logins

**Schema Changes**:

```sql
-- Extend user_role enum
ALTER TYPE user_role ADD VALUE 'client';

-- Add client_id foreign key to users
ALTER TABLE users ADD COLUMN client_id INTEGER REFERENCES clients(id);

-- Add portal_enabled flag to clients
ALTER TABLE clients ADD COLUMN portal_enabled BOOLEAN DEFAULT false;

-- Create magic link tokens table (Next-Auth handles this, but for reference)
CREATE TABLE verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

### 2. Route Structure

**Decision**: Dedicated `/portal` route group with client-specific layout.

```
apps/web/src/app/
├── (dashboard)/          # Staff routes (existing)
│   ├── events/
│   ├── tasks/
│   └── clients/
├── (portal)/             # Client routes (new)
│   ├── layout.tsx        # Portal-specific layout
│   ├── page.tsx          # Portal dashboard
│   ├── events/
│   │   ├── page.tsx      # Client's events list
│   │   └── [id]/
│   │       └── page.tsx  # Event detail view
│   └── login/
│       └── page.tsx      # Magic link login
├── (auth)/               # Shared auth (existing)
│   └── login/            # Staff login
└── api/
    └── auth/             # Next-Auth endpoints
```

**Layout Differences**:
| Feature | Staff Dashboard | Client Portal |
|---------|-----------------|---------------|
| Sidebar | Full navigation | None |
| Header | User menu + notifications | Company name + logout |
| Actions | CRUD operations | View-only |
| Branding | Internal | Client-facing |

### 3. tRPC Router Structure

**Decision**: New `portal` router namespace with client-scoped procedures.

```typescript
// apps/web/src/server/routers/portal.ts
export const portalRouter = router({
  // Dashboard
  getSummary: clientProcedure.query(/* client's active events + stats */),

  // Events
  listEvents: clientProcedure.query(/* events where clientId matches */),
  getEvent: clientProcedure.input(z.object({ eventId: z.number() }))
    .query(/* single event with ownership check */),

  // Event details
  getEventTimeline: clientProcedure.input(z.object({ eventId: z.number() }))
    .query(/* status history for event */),
  getEventTasks: clientProcedure.input(z.object({ eventId: z.number() }))
    .query(/* tasks for event */),
  getEventCommunications: clientProcedure.input(z.object({ eventId: z.number() }))
    .query(/* communications for event */),

  // Profile
  getProfile: clientProcedure.query(/* client company details */),
});
```

**Client Procedure Definition**:

```typescript
// apps/web/src/server/trpc.ts
export const clientProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  if (ctx.session.user.role !== 'client') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Client access required' });
  }

  // Ensure client_id is present
  const clientId = ctx.session.user.clientId;
  if (!clientId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No client association' });
  }

  return next({
    ctx: {
      ...ctx,
      clientId, // Available in all portal procedures
    },
  });
});
```

### 4. Data Access Patterns

**Row-Level Security**: All portal queries filter by `clientId` from session.

```typescript
// Example: listEvents
const events = await db
  .select()
  .from(events)
  .where(eq(events.clientId, ctx.clientId))
  .orderBy(desc(events.eventDate));
```

**Ownership Check Pattern**:

```typescript
// Example: getEvent with ownership verification
const event = await db.query.events.findFirst({
  where: and(
    eq(events.id, input.eventId),
    eq(events.clientId, ctx.clientId) // Critical: ensures data isolation
  ),
});

if (!event) {
  throw new TRPCError({ code: 'NOT_FOUND' });
}
```

### 5. Magic Link Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Next.js   │     │   Email     │
│   Browser   │     │   Server    │     │   Service   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Enter email    │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ 2. Find user with │
       │                   │    role=client    │
       │                   │                   │
       │                   │ 3. Generate token │
       │                   │    + store in DB  │
       │                   │                   │
       │                   │ 4. Send magic link│
       │                   │──────────────────>│
       │                   │                   │
       │                   │                   │ 5. Email delivered
       │<──────────────────│                   │
       │ "Check your email"│                   │
       │                   │                   │
       │ 6. Click link     │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ 7. Verify token   │
       │                   │    + create session│
       │                   │                   │
       │ 8. Redirect to    │                   │
       │    /portal        │                   │
       │<──────────────────│                   │
```

**Next-Auth Configuration**:

```typescript
// apps/web/src/server/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({ /* existing staff login */ }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      // Only allow magic link for client role
      async sendVerificationRequest({ identifier, url, provider }) {
        // Custom email template for clients
        await sendClientMagicLink(identifier, url);
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'email') {
        // Verify user has client role
        const dbUser = await getUserByEmail(user.email);
        return dbUser?.role === 'client';
      }
      return true;
    },
    async session({ session, user }) {
      // Include clientId in session for portal procedures
      if (user.role === 'client') {
        session.user.clientId = user.clientId;
      }
      return session;
    },
  },
};
```

### 6. Staff Controls

Administrators can manage client portal access:

```typescript
// clients router additions
enablePortalAccess: adminProcedure
  .input(z.object({
    clientId: z.number(),
    contactEmail: z.string().email(),
  }))
  .mutation(async ({ input }) => {
    // 1. Update client portal_enabled = true
    // 2. Create user with role=client, client_id=clientId
    // 3. Optionally send welcome email with magic link
  }),

disablePortalAccess: adminProcedure
  .input(z.object({ clientId: z.number() }))
  .mutation(async ({ input }) => {
    // 1. Update client portal_enabled = false
    // 2. Deactivate client user (is_active = false)
    // 3. Invalidate any active sessions
  }),
```

## Component Architecture

### Portal Layout

```
┌────────────────────────────────────────────────────────┐
│ Header: [Company Logo]      [Company Name]   [Logout]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ Welcome, [Contact Name]                         │   │
│  │ You have 3 active events                        │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Event Card 1    │  │ Event Card 2    │             │
│  │ [Status Badge]  │  │ [Status Badge]  │             │
│  │ Date: Jan 30    │  │ Date: Feb 15    │             │
│  │ [View Details]  │  │ [View Details]  │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Event Detail View

```
┌────────────────────────────────────────────────────────┐
│ ← Back to Events                                       │
├────────────────────────────────────────────────────────┤
│ Corporate Holiday Party                                │
│ [Planning] status badge                                │
│                                                        │
│ Date: January 30, 2026                                 │
│ Location: Grand Ballroom, Downtown Hotel              │
│ Guest Count: 150                                       │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Progress Timeline                                 │  │
│ │ ● Inquiry (Jan 10) ─ ● Planning (Jan 15) ─ ○ ... │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Tasks (5 of 12 completed)                         │  │
│ │ ✓ Confirm venue booking                           │  │
│ │ ✓ Finalize menu selection                        │  │
│ │ ○ Send final headcount (Due: Jan 25)             │  │
│ │ ○ Confirm AV requirements                         │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Recent Communications                             │  │
│ │ Jan 20 - Phone: Discussed menu options            │  │
│ │ Jan 18 - Email: Sent venue contract               │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## Security Considerations

### Data Isolation

1. **All portal queries include clientId filter** - Never expose other clients' data
2. **Ownership checked at procedure level** - Not at component level
3. **Test coverage required** - Cross-client access tests mandatory

### Session Security

1. **Short-lived magic link tokens** - 15-minute expiry
2. **Secure session cookies** - HttpOnly, Secure, SameSite=Lax
3. **Session invalidation** - On portal disable or password reset

### Audit Logging

```typescript
// Log all portal access for audit
await db.insert(portalAccessLog).values({
  userId: ctx.session.user.id,
  clientId: ctx.clientId,
  action: 'view_event',
  resourceId: eventId,
  timestamp: new Date(),
});
```

## Testing Strategy

### Unit Tests
- `clientProcedure` middleware enforces role check
- Portal procedures filter by clientId
- Magic link token generation and validation

### Integration Tests
- Client login flow with magic link
- Cross-client data isolation (critical)
- Portal enable/disable workflows

### E2E Tests
- Full magic link login journey
- Event detail viewing
- Session expiry handling

## Performance Considerations

### Indexes Required

```sql
-- Efficient client event lookup
CREATE INDEX idx_events_client_id ON events(client_id);

-- Fast user lookup by client
CREATE INDEX idx_users_client_id ON users(client_id) WHERE client_id IS NOT NULL;
```

### Caching Strategy

- Portal summary data: 60-second stale-while-revalidate
- Event details: 30-second cache (status may change)
- Communications: No cache (always fresh)

## Migration Path

1. **Phase 1** (this proposal): Read-only portal with magic link
2. **Phase 2** (future): Client-initiated change requests
3. **Phase 3** (future): Real-time notifications for clients
4. **Phase 4** (future): Mobile-optimized PWA
