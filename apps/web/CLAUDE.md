# CLAUDE.md - Next.js Web Application

Next.js 16 + React 19 full-stack application with tRPC v11 API, Next-Auth v5 authentication, and comprehensive testing infrastructure.

## Quick Context

**Tech Stack**: Next.js 16 (App Router), React 19, tRPC v11, Next-Auth v5, Tailwind CSS 4
**Architecture**: Domain-driven organization, hybrid microservices (Next.js + Go scheduler)
**Testing**: Vitest + Playwright + TestContainers + Quality Gates (visual/a11y/performance)

## Essential Commands

### Development
```bash
# Start development server (from project root or this directory)
pnpm dev                       # Next.js app on localhost:3000

# Type checking and linting
pnpm type-check               # TypeScript type checking
pnpm lint                     # ESLint + Biome linting
pnpm format                   # Format code with Biome
pnpm format:check             # Check formatting without writing
```

### Testing
```bash
# Unit/Component tests (Vitest)
pnpm test                     # Run all tests
pnpm test:watch               # Watch mode for development
pnpm test:ui                  # Vitest UI on localhost:51204
pnpm test:coverage            # With coverage report

# Integration tests (requires Go service)
pnpm test:integration         # Real cross-service tests with TestContainers

# E2E tests (Playwright)
pnpm test:e2e                 # Full E2E test suite
pnpm test:e2e:ui              # Playwright UI for debugging

# Quality gates (visual regression, accessibility, performance)
pnpm test:quality             # Visual/a11y/performance testing
pnpm test:quality:update      # Update visual baselines after UI changes
```

### Building
```bash
pnpm build                    # Production build
pnpm start                    # Start production server
```

## Architecture Patterns

### Domain-Driven Organization

Files are organized by **business domain** (events, tasks, resources, clients), NOT technical layers.

```
src/
├── server/routers/           # Domain-organized tRPC API routes
│   ├── _app.ts              # Root router combining all domains
│   ├── event.ts             # Event management (✅ implemented)
│   ├── task.ts              # Task management
│   ├── resource.ts          # Resource scheduling
│   ├── analytics.ts         # Analytics & reporting
│   ├── clients.ts           # Client management & communication
│   ├── user.ts              # User management
│   └── portal.ts            # Client portal (read-only access)
│
├── components/              # Domain-organized UI components
│   ├── events/             # Event-related components
│   ├── tasks/              # Task management UI
│   ├── resources/          # Resource scheduling UI
│   ├── clients/            # Client management UI
│   ├── analytics/          # Charts and analytics UI
│   ├── auth/               # Authentication forms
│   ├── dashboard/          # Navigation and layout
│   └── a11y/               # Accessibility components
│
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Protected admin/manager routes
│   │   ├── page.tsx        # Main dashboard
│   │   ├── events/         # Event management pages
│   │   ├── tasks/          # Task management pages
│   │   ├── resources/      # Resource management pages
│   │   ├── clients/        # Client management pages
│   │   └── analytics/      # Analytics pages
│   ├── portal/             # Client portal (separate auth)
│   ├── api/                # API routes (auth, tRPC, health)
│   └── auth pages          # Login, register
│
└── lib/                    # Shared utilities and hooks
    ├── trpc.ts             # tRPC client configuration
    ├── auth.ts             # Next-Auth configuration
    ├── logger.ts           # Structured JSON logging
    ├── form-utils.ts       # Form validation helpers
    ├── form-a11y.ts        # Accessibility utilities
    └── use-auth.ts         # Authentication hooks
```

### tRPC Router Patterns

#### Protected Procedures
```typescript
// src/server/trpc.ts - Authorization middleware
export const protectedProcedure = t.procedure.use(requireAuth);    // Any authenticated user
export const adminProcedure = t.procedure.use(requireAdmin);       // Admin only
export const clientProcedure = t.procedure.use(requireClient);     // Client portal

// Domain router example - src/server/routers/event.ts
export const eventRouter = router({
  // Admin-only procedures
  create: adminProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => { /* implementation */ }),

  archive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => { /* implementation */ }),

  // Protected procedures (admin + manager)
  list: protectedProcedure
    .input(listEventsSchema)
    .query(async ({ ctx, input }) => { /* implementation */ }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => { /* implementation */ }),

  // Real-time subscriptions
  statusUpdates: protectedProcedure
    .subscription(() => { /* SSE implementation */ }),
});
```

#### Input Validation with Zod
```typescript
// Always use Zod schemas for input validation
const createEventSchema = z.object({
  clientId: z.number().positive(),
  eventName: z.string().min(1).max(200),
  eventDate: z.date().min(new Date()), // Future dates only
  description: z.string().optional(),
});

// Use discriminated unions for status updates
const updateStatusSchema = z.object({
  id: z.number(),
  status: z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']),
  notes: z.string().optional(),
});
```

#### Error Handling Patterns
```typescript
import { TRPCError } from '@trpc/server';
import { logger } from '@/lib/logger';

// Standard error handling in procedures
try {
  const event = await ctx.db.select().from(events).where(eq(events.id, input.id));
  if (!event) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
  }
} catch (error) {
  logger.error('Failed to get event', error, {
    context: 'event.getById',
    eventId: input.id
  });
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database error' });
}
```

### Component Architecture

#### Accessibility-First Design

**WCAG 2.1 AA compliance** is enforced by quality gates and axe-core testing.

```typescript
// src/lib/form-a11y.ts - Accessibility utilities
import { getInputA11yProps, getErrorProps } from '@/lib/form-a11y';

function EventForm() {
  const [errors, setErrors] = useState({});

  return (
    <div>
      <input
        {...getInputA11yProps('eventName', !!errors.eventName)}
        value={eventName}
        onChange={...}
      />
      {errors.eventName && (
        <span {...getErrorProps('eventName')} className="text-red-600">
          {errors.eventName}
        </span>
      )}
    </div>
  );
}
```

#### Component Testing Patterns

Tests are **co-located** with components (`Component.tsx` + `Component.test.tsx`).

```typescript
// src/components/events/EventCard.test.tsx
import { render, screen } from '@/test/helpers/render';
import { EventCard } from './EventCard';

describe('EventCard', () => {
  const mockEvent = {
    id: 1,
    eventName: 'Test Event',
    status: 'planning' as const,
    // ... other required props
  };

  it('renders event information correctly', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('meets accessibility standards', async () => {
    const { container } = render(<EventCard event={mockEvent} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

#### Domain Component Organization

Each domain exports components via index files for clean imports:

```typescript
// src/components/events/index.ts
export { EventCard } from './EventCard';
export { EventForm } from './EventForm';
export { EventStatusBadge } from './EventStatusBadge';
export { EventStatusTimeline } from './EventStatusTimeline';
export { EventListSkeleton } from './EventListSkeleton';

// Usage in pages
import { EventCard, EventForm, EventStatusBadge } from '@/components/events';
```

### Authentication & Authorization

#### Next-Auth v5 Configuration

```typescript
// src/lib/auth.ts
export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        // Custom credential validation
      },
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    sessionsTable: sessions,
    accountsTable: accounts,
  }),
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        role: token.role as 'administrator' | 'manager' | 'client',
        clientId: token.clientId as number | undefined,
      },
    }),
  },
};
```

#### Role-Based Access Control

```typescript
// src/lib/use-auth.ts - Client-side auth hooks
export function useRequireAuth(requiredRole?: 'administrator' | 'manager' | 'client') {
  const { data: session, status } = useSession();

  if (status === 'loading') return { isLoading: true };
  if (!session) return { isUnauthorized: true };
  if (requiredRole && session.user.role !== requiredRole) {
    return { isForbidden: true };
  }

  return { session, user: session.user };
}

// Usage in components
function AdminOnlyComponent() {
  const { session, isUnauthorized, isForbidden } = useRequireAuth('administrator');

  if (isUnauthorized) return <LoginRedirect />;
  if (isForbidden) return <AccessDenied />;

  return <AdminPanel user={session.user} />;
}
```

#### Middleware Protection

```typescript
// src/middleware.ts - Route protection
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes
  if (['/login', '/register', '/api/health'].includes(pathname)) {
    return;
  }

  // Portal routes require client role
  if (pathname.startsWith('/portal')) {
    if (!isLoggedIn || req.auth.user?.role !== 'client') {
      return NextResponse.redirect(new URL('/portal/login', req.url));
    }
  }

  // Dashboard routes require admin or manager
  if (pathname.startsWith('/') && pathname !== '/') {
    if (!isLoggedIn || !['administrator', 'manager'].includes(req.auth.user?.role)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
});
```

### Structured Logging

**Critical**: Use the logger utility, never `console.*` in production code.

```typescript
// src/lib/logger.ts - Structured JSON logging
import { logger } from '@/lib/logger';

// Operational events
logger.info('Event created successfully', {
  eventId: newEvent.id,
  clientId: input.clientId,
  context: 'event.create'
});

// Recoverable issues
logger.warn('Go scheduling service unavailable, using fallback', {
  context: 'resource.checkConflicts',
  fallback: 'assume_no_conflicts'
});

// Failures with stack traces
logger.error('Database connection failed', error, {
  context: 'event.list',
  query: 'listEvents',
});

// Security events (automatically categorized)
logger.security('authz.denied', {
  userId: session.user.id,
  attemptedAction: 'event.delete',
  actualRole: session.user.role,
});
```

Output format (JSON, parseable by log aggregators):
```json
{"timestamp":"2026-02-01T05:24:58.745Z","level":"error","message":"Event creation failed","context":{"eventId":null,"error":{"message":"Database timeout","stack":"..."}}}
```

## Testing Infrastructure

### Test Organization

```
test/
├── helpers/                    # Reusable test utilities
│   ├── db.ts                  # TestContainers PostgreSQL setup
│   ├── trpc.ts                # Test caller factories (admin, manager, client, unauthenticated)
│   ├── factories.ts           # Test data factories (createEvent, createTask, etc.)
│   ├── input-factories.ts     # Auth matrix data + procedure input generators
│   ├── render.tsx             # Custom render with providers (React Query + tRPC)
│   └── component-factories.ts  # Component prop factories
│
├── scenarios/                  # Business logic scenario tests
│   ├── event-lifecycle.test.ts      # Event state transitions
│   ├── task-dependencies.test.ts    # Task dependency chains
│   ├── resource-conflicts.test.ts   # Resource scheduling conflicts
│   └── client-communication.test.ts # Communication workflows
│
├── integration/               # Cross-service integration tests
│   ├── setup.ts              # Go service build/start/stop helpers
│   └── cross-service.test.ts  # Real Next.js ↔ Go scheduler integration
│
├── e2e/                      # End-to-end Playwright tests
│   ├── workflows/            # User workflow tests
│   ├── quality-gates/        # Visual regression + accessibility + performance
│   └── helpers/              # Page objects, auth, performance measurement
│
└── auth-matrix.test.ts        # Authorization boundary matrix (~97 test cases)
```

### Unit & Component Tests

```typescript
// Co-located tests next to implementation files
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@/test/helpers/render';
import { createEvent } from '@/test/helpers/factories';

describe('EventCard Component', () => {
  it('displays event information correctly', () => {
    const event = createEvent({ eventName: 'Birthday Party' });
    render(<EventCard event={event} />);

    expect(screen.getByText('Birthday Party')).toBeInTheDocument();
    expect(screen.getByLabelText(/event status/i)).toBeInTheDocument();
  });
});
```

### tRPC Router Testing

```typescript
// src/server/routers/event.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '@/test/helpers/db';
import { createAdminCaller, createManagerCaller, createUnauthenticatedCaller } from '@/test/helpers/trpc';
import { createEvent, createClient } from '@/test/helpers/factories';

describe('Event Router', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
  });

  afterAll(async () => {
    await teardownTestDatabase(db);
  });

  describe('create procedure', () => {
    it('creates event when admin authenticated', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);

      const result = await caller.event.create({
        clientId: client.id,
        eventName: 'Test Event',
        eventDate: new Date('2025-06-15'),
      });

      expect(result.eventName).toBe('Test Event');
      expect(result.status).toBe('inquiry');
    });

    it('throws UNAUTHORIZED when not authenticated', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(() =>
        caller.event.create({
          clientId: 1,
          eventName: 'Test Event',
          eventDate: new Date(),
        })
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });
});
```

### Cross-Service Integration Tests

```bash
# Requires Go 1.24+ toolchain
pnpm test:integration
```

Tests the actual Next.js ↔ Go scheduler communication:

```typescript
// test/integration/cross-service.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startGoService, stopGoService } from './setup';
import { createAdminCaller } from '@/test/helpers/trpc';

describe('Cross-Service Integration', () => {
  beforeAll(async () => {
    await startGoService(); // Builds and starts real Go service
  });

  afterAll(async () => {
    await stopGoService();
  });

  it('detects resource conflicts via Go service', async () => {
    const caller = createAdminCaller(db);

    // Create overlapping resource assignments
    const resource = await createResource(db);
    await caller.resource.assign({
      resourceId: resource.id,
      eventId: 1,
      startTime: new Date('2025-06-15T10:00:00Z'),
      endTime: new Date('2025-06-15T14:00:00Z'),
    });

    // This should detect conflict via real Go service
    const result = await caller.resource.checkConflicts({
      resourceId: resource.id,
      startTime: new Date('2025-06-15T12:00:00Z'),
      endTime: new Date('2025-06-15T16:00:00Z'),
    });

    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts).toHaveLength(1);
  });
});
```

### E2E Tests (Playwright)

```typescript
// test/e2e/workflows/event-lifecycle.e2e.ts
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Event Lifecycle Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('create and manage event from inquiry to completion', async ({ page }) => {
    // Navigate to create event
    await page.goto('/events/new');

    // Fill out event form
    await page.fill('[data-testid="event-name"]', 'Test Wedding');
    await page.selectOption('[data-testid="client-select"]', '1');
    await page.fill('[data-testid="event-date"]', '2025-06-15');

    // Submit and verify redirect
    await page.click('[data-testid="create-event-btn"]');
    await expect(page).toHaveURL(/\/events\/\d+/);

    // Verify event appears in list
    await page.goto('/events');
    await expect(page.getByText('Test Wedding')).toBeVisible();

    // Update status through workflow
    await page.click('[data-testid="update-status-btn"]');
    await page.selectOption('[data-testid="status-select"]', 'planning');
    await page.click('[data-testid="confirm-status-btn"]');

    await expect(page.getByText('Planning')).toBeVisible();
  });
});
```

### Quality Gates

**Visual regression**, **accessibility**, and **performance** tests for key pages:

```bash
pnpm test:quality             # Run quality gate tests
pnpm test:quality:update      # Update baselines after UI changes
```

Tested pages: `/login`, `/` (dashboard), `/events`, `/clients`

Quality criteria:
- **Visual**: <1% pixel difference from baseline screenshots
- **Accessibility**: WCAG 2.1 AA compliance (no critical/serious violations)
- **Performance**: LCP < 3s, CLS < 0.15

```typescript
// test/e2e/quality-gates/dashboard.quality.ts
test('accessibility (WCAG 2.1 AA)', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  expect(serious).toHaveLength(0);
});

test('performance (LCP < 3s, CLS < 0.15)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const lcp = await measureLCP(page);
  const cls = await measureCLS(page);

  expect(lcp).toBeLessThan(3000);
  expect(cls).toBeLessThan(0.15);
});
```

### Authorization Matrix Tests

Systematically verifies role-based access control across **all tRPC procedures**:

```typescript
// test/auth-matrix.test.ts - ~97 test cases
describe('Authorization Boundary Matrix', () => {
  // Tests that admin procedures reject manager, client, and unauthenticated
  // Tests that protected procedures reject unauthenticated
  // Tests that client procedures reject admin, manager, and unauthenticated

  it.each(allProcedures.filter(p => p.auth === 'admin'))(
    'admin procedure $router.$procedure rejects non-admin access',
    async ({ router, procedure }) => {
      const managerCaller = createManagerCaller(db);
      const input = getProcedureInput(router, procedure, authData);

      await expect(() =>
        managerCaller[router][procedure](input)
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
  );
});
```

## Performance & Optimization

### Real-Time Updates

tRPC subscriptions provide **Server-Sent Events** for live updates:

```typescript
// Real-time event status updates
const statusUpdates = trpc.event.statusUpdates.useSubscription();

// Real-time task assignment notifications
const taskUpdates = trpc.task.assignmentUpdates.useSubscription();

// Target: Updates visible within 2 seconds (SC-004)
```

### Caching Strategy

```typescript
// Analytics results cached for 5 minutes
// src/server/services/analytics-cache.ts
import { cache } from '@/lib/redis';

export async function getCachedAnalytics(dateRange: DateRange) {
  const cacheKey = `analytics:${dateRange.start}:${dateRange.end}`;

  let cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const fresh = await generateAnalytics(dateRange);
  await cache.setex(cacheKey, 300, JSON.stringify(fresh)); // 5 min TTL

  return fresh;
}
```

### Bundle Optimization

```typescript
// Code splitting by domain
const EventManagement = lazy(() => import('@/components/events'));
const TaskManagement = lazy(() => import('@/components/tasks'));
const ResourceScheduling = lazy(() => import('@/components/resources'));

// Preload critical routes
router.prefetch('/events');
router.prefetch('/tasks');
```

## Development Workflows

### Adding New tRPC Procedures

1. **Define Zod schema** for input validation
2. **Implement procedure** in domain router (`src/server/routers/`)
3. **Write router tests** with authorization matrix coverage
4. **Update type exports** in domain router
5. **Add to UI** with tRPC React Query hooks

```typescript
// 1. Schema definition
const updateEventSchema = z.object({
  id: z.number(),
  eventName: z.string().min(1).max(200).optional(),
  eventDate: z.date().min(new Date()).optional(),
});

// 2. Procedure implementation
update: adminProcedure
  .input(updateEventSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await ctx.db
      .update(events)
      .set(input)
      .where(eq(events.id, input.id))
      .returning();

    logger.info('Event updated', {
      eventId: input.id,
      context: 'event.update'
    });

    return result[0];
  }),

// 3. Router tests
it('updates event when admin authenticated', async () => {
  const caller = createAdminCaller(db);
  const event = await createEvent(db);

  const result = await caller.event.update({
    id: event.id,
    eventName: 'Updated Name',
  });

  expect(result.eventName).toBe('Updated Name');
});

// 4. UI integration
const updateEvent = trpc.event.update.useMutation({
  onSuccess: () => {
    toast.success('Event updated successfully');
    router.refresh();
  },
});
```

### Adding New Components

1. **Create component** in domain directory (`src/components/domain/`)
2. **Write component tests** with accessibility checks
3. **Add to domain index** for clean imports
4. **Integrate with pages** and forms

```typescript
// 1. Component creation with accessibility
export function NewComponent({ data }: Props) {
  return (
    <div role="region" aria-label="Component description">
      <h2 id="heading-id">Title</h2>
      <p aria-describedby="heading-id">Content</p>
    </div>
  );
}

// 2. Component tests
describe('NewComponent', () => {
  it('meets accessibility standards', async () => {
    const { container } = render(<NewComponent data={mockData} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// 3. Export in domain index
export { NewComponent } from './NewComponent';

// 4. Use in pages
import { NewComponent } from '@/components/domain';
```

### Database Schema Changes

When updating schema in `packages/database/`:

```bash
# 1. Update schema files in packages/database/src/schema/
cd packages/database
pnpm db:generate              # Generate Drizzle migrations

# 2. Apply to database
pnpm db:push                  # Dev only (no migration files)
# OR
pnpm db:migrate               # Production (applies migration files)

# 3. Regenerate Go types
cd ../../apps/scheduling-service
sqlc generate                 # Update Go service types

# 4. Verify TypeScript types
cd ../web
pnpm type-check              # Should pass with new schema
```

## Troubleshooting

### Common Issues

**Type errors after schema changes:**
```bash
cd packages/database && pnpm db:generate
cd ../../apps/scheduling-service && sqlc generate
cd ../web && pnpm type-check
```

**tRPC client type mismatches:**
```bash
# Restart dev server to pick up router type changes
pnpm dev
```

**Test database connection issues:**
```bash
# Check Docker containers
docker ps | grep postgres
docker-compose restart postgres
```

**Visual regression test failures:**
```bash
# Update baselines after intentional UI changes
pnpm test:quality:update
git add test/e2e/quality-gates/*.png
```

**Go service integration test failures:**
```bash
# Ensure Go toolchain is available
go version  # Requires Go 1.24+
cd ../../apps/scheduling-service && go build -o bin/test-scheduler cmd/scheduler/main.go
```

### Debug Modes

```bash
# Playwright debugging
pnpm test:e2e:ui               # Interactive mode with browser

# Vitest debugging
pnpm test:ui                   # Vitest UI for test debugging

# tRPC debugging
TRPC_DEBUG=1 pnpm dev          # Verbose tRPC logs

# Database query debugging
DATABASE_DEBUG=1 pnpm dev      # SQL query logs
```

### Performance Debugging

```bash
# Next.js bundle analysis
ANALYZE=true pnpm build

# React DevTools Profiler
# Install React DevTools browser extension

# tRPC query analysis
# Use React Query DevTools in browser (auto-enabled in dev)
```

## Configuration

### Environment Variables

Required `.env.local` (copy from `.env.example`):

```bash
# Database (shared with Go service)
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"

# Authentication
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# Cross-service communication
SCHEDULING_SERVICE_URL="http://localhost:8080"

# Optional: Email (Resend)
RESEND_API_KEY=""
FROM_EMAIL="no-reply@example.com"

# Optional: Redis (caching)
REDIS_URL="redis://localhost:6379"
```

### Next.js Configuration

Key settings in `next.config.js`:
- **Experimental features**: React 19, Turbopack, optimizePackageImports
- **Bundle analysis**: `ANALYZE=true` environment variable support
- **TypeScript**: Strict mode enabled
- **ESLint**: Integration with custom rules

## Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.1+ | App Router, React 19 support |
| React | 19.2+ | UI framework with latest features |
| tRPC | 11.8+ | End-to-end type safety |
| Next-Auth | 5.0.0-beta | Authentication (beta for Next.js 16) |
| Drizzle ORM | 0.45+ | Database queries and migrations |
| Tailwind CSS | 4.1+ | Styling with latest engine |
| React Query | 5.90+ | Server state management |
| Zod | 4.3+ | Runtime type validation |

### Testing Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Vitest | 4.0+ | Unit/integration testing |
| Playwright | 1.58+ | E2E testing |
| Testing Library | 16.3+ | Component testing utilities |
| TestContainers | 11.11+ | Database integration tests |
| axe-core | 4.11+ | Accessibility testing |

## Next Steps

**Current Phase**: Event Management implementation (Phase 3)

**Immediate priorities**:
1. Complete event subscription implementation for real-time updates
2. Build remaining event management UI components (timeline, filters)
3. Implement event archiving functionality
4. Add comprehensive event router test coverage

**Next phases**: Task management (Phase 4), Resource scheduling (Phase 5)

See `../../specs/001-event-lifecycle-management/tasks.md` for detailed task breakdown.

## Related Documentation

- **Project Overview**: `../../CLAUDE.md` (monorepo guidance)
- **Database Schema**: `../../packages/database/CLAUDE.md`
- **Go Service**: `../../apps/scheduling-service/CLAUDE.md`
- **Architecture Decisions**: `../../docs/decisions/`
- **Implementation Guides**: `../../docs/implementation-guides/`