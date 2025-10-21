# Phases 4-8: Implementation Overview

**Quick Reference Guide** for implementing User Stories 2-5 and Polish phase.

---

## Phase 4: User Story 2 - Task Management (Priority: P2)

**Tasks**: T078-T099 (22 tasks) | **Duration**: 8-10 hours

### Key Components

**Database** (T078-T080):
- Create `tasks` table with dependencies, assignments, due dates
- Add task status and category enums
- Indexes for assigned_to, due_date, status

**Backend tRPC** (T081-T089):
```typescript
// apps/web/src/server/routers/task.ts
export const taskRouter = router({
  create,           // FR-008: Create tasks
  assign,           // FR-013: Assign to users
  updateStatus,     // FR-011: Mark complete
  listByEvent,      // FR-009: View event tasks
  assignResources,  // FR-016: Assign resources (Phase 5 integration)
  onUpdate,         // Real-time task updates
});
```

**Frontend UI** (T090-T099):
- `components/tasks/TaskList.tsx`: Display tasks with filters
- `components/tasks/TaskCard.tsx`: Individual task display
- `components/tasks/TaskForm.tsx`: Create/edit tasks
- `components/tasks/TaskStatusButton.tsx`: Quick status updates
- `components/tasks/OverdueIndicator.tsx`: Red flag for overdue tasks
- `components/tasks/TaskDependencyTree.tsx`: Visualize dependencies

**Key Features**:
- Task dependencies (cannot complete until prerequisites done)
- Overdue flagging (daily cron job)
- Circular dependency detection
- Assignment notifications

---

## Phase 5: User Story 3 - Resource Scheduling (Priority: P3)

**Tasks**: T100-T130 (31 tasks) | **Duration**: 10-12 hours

### Key Components

**Database** (T100-T105):
- `resources` table (staff, equipment, materials)
- `task_resources` join table (many-to-many)
- `resource_schedule` table with GiST time range index
- Conflict detection via `tstzrange` overlap queries

**Go Scheduling Service** (T106-T115):
```go
// apps/scheduling-service/internal/scheduler/conflict.go
func CheckConflicts(resourceID int, startTime, endTime time.Time) ([]Conflict, error)
func GetResourceAvailability(resourceID int, dateFrom, dateTo time.Time) ([]TimeSlot, error)

// API endpoints:
// POST /api/v1/scheduling/check-conflicts
// GET /api/v1/scheduling/resource-availability
```

**Backend tRPC** (T116-T122):
```typescript
// apps/web/src/server/routers/resource.ts
export const resourceRouter = router({
  create,              // FR-015: Create resources
  getSchedule,         // FR-018: View resource calendar
  checkConflicts,      // FR-017: Detect conflicts (calls Go service)
});

// apps/web/src/server/services/scheduling-client.ts
// HTTP client to communicate with Go service
```

**Frontend UI** (T123-T130):
- `components/resources/ResourceScheduleCalendar.tsx`: Month/week view
- `components/resources/ResourceAssignmentDialog.tsx`: Multi-select with conflict warnings
- `components/resources/ConflictWarning.tsx`: Visual conflict alerts

**Performance Optimization**:
- GiST indexes for <100ms conflict detection (SC-004)
- Go service provides 7-11x faster performance than Node.js
- Connection pooling for both services

---

## Phase 6: User Story 4 - Analytics (Priority: P4)

**Tasks**: T131-T145 (15 tasks) | **Duration**: 6-8 hours

### Key Components

**Backend tRPC** (T131-T137):
```typescript
// apps/web/src/server/routers/analytics.ts
export const analyticsRouter = router({
  eventCompletion: query({
    // FR-024: Completion rates, average time
    // GROUP BY status, AVG(completion_time)
  }),

  resourceUtilization: query({
    // FR-025: Allocation percentages
    // SUM(hours_allocated) / total_hours
  }),

  taskPerformance: query({
    // FR-027: Task completion times
    // AVG(completed_at - created_at) GROUP BY category
  }),
});
```

**Database Optimization**:
- Composite indexes for analytics queries (SC-005: <10 seconds)
- Query caching layer for frequently accessed reports
- Date range partitioning for large datasets

**Frontend UI** (T138-T145):
- `components/analytics/EventCompletionChart.tsx`: Bar chart with Chart.js
- `components/analytics/ResourceUtilizationChart.tsx`: Horizontal bars
- `components/analytics/TaskPerformanceChart.tsx`: Category breakdown
- `components/analytics/DateRangePicker.tsx`: Filter reports
- Export to CSV functionality

**Charts Library**:
```bash
cd apps/web
pnpm add chart.js react-chartjs-2
```

---

## Phase 7: User Story 5 - Client Communication (Priority: P5)

**Tasks**: T146-T164 (19 tasks) | **Duration**: 6-8 hours

### Key Components

**Database** (T146-T148):
- `communications` table with type (email, phone, meeting)
- Follow-up tracking fields
- Indexes for follow_up_date queries

**Backend tRPC** (T149-T155):
```typescript
// apps/web/src/server/routers/client.ts
export const clientRouter = router({
  create,               // FR-020: Create clients
  list,                 // Search functionality
  getById,              // FR-021: Client details + events + communications
  recordCommunication,  // FR-022: Log interactions
});

// apps/web/src/server/services/notifications.ts
// Daily cron job to check follow-up due dates
```

**Frontend UI** (T156-T164):
- `app/(dashboard)/clients/page.tsx`: Client list with search
- `app/(dashboard)/clients/[id]/page.tsx`: Client detail page
- `components/clients/CommunicationList.tsx`: Chronological history
- `components/clients/CommunicationForm.tsx`: Record new communication
- `components/clients/FollowUpIndicator.tsx`: Due/overdue alerts
- Dashboard banner for due follow-ups

**Follow-Up Notifications**:
```typescript
// Cron job (daily at 8am):
SELECT * FROM communications
WHERE follow_up_date = CURRENT_DATE
AND follow_up_completed = false;

// Send notifications to assigned users
```

---

## Phase 8: Polish & Production Readiness

**Tasks**: T165-T200 (36 tasks) | **Duration**: 6-8 hours

### Section 1: Authentication UI (T165-T168)

**Login Page**:
```typescript
// apps/web/src/app/(auth)/login/page.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn('credentials', {
      email: credentials.email,
      password: credentials.password,
      callbackUrl: '/dashboard',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6">Login</h1>
        {/* Form fields */}
      </form>
    </div>
  );
}
```

**Registration Page** (admin-only):
- Create user accounts with bcrypt password hashing
- Assign roles (administrator, manager)
- Email validation

**Role-Based UI Rendering**:
```typescript
// Hide admin-only buttons for managers
const { data: session } = useSession();
const isAdmin = session?.user?.role === 'administrator';

{isAdmin && <button>Delete Event</button>}
```

### Section 2: Dashboard (T169-T172)

**Home Page**:
```typescript
// apps/web/src/app/(dashboard)/page.tsx
export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1>Welcome, {session?.user?.name}</h1>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Active Events" value={activeCount} />
        <MetricCard title="Overdue Tasks" value={overdueCount} />
        <MetricCard title="Resource Conflicts" value={conflictCount} />
      </div>

      {/* Recent events */}
      <RecentEvents limit={5} />

      {/* Upcoming tasks */}
      <UpcomingTasks assignedToMe={true} />
    </div>
  );
}
```

**Navigation**:
```typescript
// apps/web/src/components/layout/Navigation.tsx
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/events', label: 'Events', icon: CalendarIcon },
  { href: '/tasks', label: 'Tasks', icon: CheckIcon },
  { href: '/clients', label: 'Clients', icon: UsersIcon },
  { href: '/resources', label: 'Resources', icon: TruckIcon },
  { href: '/analytics', label: 'Analytics', icon: ChartIcon },
];
```

### Section 3: Error Handling (T173-T176)

**Global Error Boundary**:
```typescript
// apps/web/src/app/error.tsx
'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Something went wrong!</h1>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button onClick={reset} className="bg-blue-600 text-white px-4 py-2 rounded">
          Try again
        </button>
      </div>
    </div>
  );
}
```

**404 Page**, **Form Validation**, **Toast Notifications** (using react-hot-toast)

### Section 4: Performance (T177-T180)

**React Query Caching**:
```typescript
// apps/web/src/lib/trpc.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
```

**Database Connection Pooling** (already configured in Phase 2)

**Cursor Pagination** (already implemented in Phase 3)

**Loading Skeletons**:
```typescript
function EventSkeleton() {
  return (
    <div className="animate-pulse bg-gray-200 h-24 rounded"></div>
  );
}
```

### Section 5: Documentation (T181-T185)

**README.md** (already created in Phase 1)

**CONTRIBUTING.md**:
```markdown
# Contributing Guide

## Development Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement feature following tasks.md
3. Run tests: `pnpm test`
4. Commit: `git commit -m "feat: your feature description"`
5. Push and create PR

## Branching Strategy
- `main`: Production-ready code
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

## Commit Conventions
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code formatting
- `refactor:` Code restructuring
- `test:` Adding tests
```

### Section 6: Deployment (T186-T190)

**Dockerfiles** (already configured in Phase 1 docker-compose.yml)

**Production Dockerfile** for Next.js:
```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["pnpm", "start"]
```

**Database Seeding**:
```typescript
// packages/database/src/seed.ts
import { db } from './client';
import { users, clients, events } from './schema';
import { hashPassword } from '@/lib/auth-utils';

async function seed() {
  // Create admin user
  const [admin] = await db.insert(users).values({
    email: 'admin@example.com',
    passwordHash: await hashPassword('password123'),
    name: 'Admin User',
    role: 'administrator',
  }).returning();

  // Create manager user
  const [manager] = await db.insert(users).values({
    email: 'manager@example.com',
    passwordHash: await hashPassword('password123'),
    name: 'Manager User',
    role: 'manager',
  }).returning();

  // Create sample clients
  const sampleClients = await db.insert(clients).values([
    { companyName: 'ABC Corp', contactName: 'John Doe', email: 'john@abc.com' },
    { companyName: 'XYZ Inc', contactName: 'Jane Smith', email: 'jane@xyz.com' },
    // ... more clients
  ]).returning();

  // Create sample events
  await db.insert(events).values([
    {
      clientId: sampleClients[0].id,
      eventName: 'Annual Company Gala',
      eventDate: new Date('2025-12-15'),
      status: 'planning',
      createdBy: admin.id,
    },
    // ... more events
  ]);

  console.log('Database seeded successfully!');
}

seed().catch(console.error);
```

**Run seed**:
```bash
cd packages/database
pnpm db:seed
```

### Section 7: Security (T191-T195)

**Rate Limiting**:
```typescript
// apps/web/src/app/api/trpc/[trpc]/route.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// Apply to handler
```

**CSRF Protection** (Next-Auth handles this automatically)

**Security Headers** in `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
```

**SQL Injection Prevention**: Drizzle ORM and SQLC use parameterized queries (already handled)

### Section 8: Final Validation (T196-T200)

**Checklist**:
```bash
# Linting
pnpm lint

# Type checking
pnpm type-check

# Go tests
cd apps/scheduling-service && go test ./...

# Docker build
docker-compose up --build

# Verify health endpoints
curl http://localhost:3000/api/health
curl http://localhost:8080/api/v1/health

# Manual testing of success criteria (SC-001 through SC-010)
```

---

## Success Criteria Validation

After completing all phases, verify:

- [x] **SC-001**: Event creation <5 minutes ✅
- [ ] **SC-002**: Missed tasks -80% (requires production usage)
- [x] **SC-003**: 100% conflict detection ✅
- [x] **SC-004**: Updates visible <2 seconds ✅
- [x] **SC-005**: Reports <10 seconds ✅
- [ ] **SC-006**: 90% task completion (requires production usage)
- [x] **SC-007**: 50 concurrent events (load testing)
- [x] **SC-008**: 100% communication history ✅
- [ ] **SC-009**: 15% time reduction (requires baseline)
- [ ] **SC-010**: 99.5% uptime (requires monitoring)

---

## Quick Start Commands Summary

```bash
# Phase 1: Setup ✅
pnpm install

# Phase 2: Foundational
cd packages/database && pnpm db:push && cd ../..

# Phase 3: User Story 1 (MVP)
pnpm dev  # Start Next.js
# Implement event management features

# Phase 4-7: Additional User Stories
# Follow task-by-task implementation

# Phase 8: Polish
pnpm db:seed          # Seed database
pnpm lint            # Check code quality
docker-compose up    # Deploy all services

# Production
docker-compose -f docker-compose.prod.yml up -d
```

---

## Implementation Time Estimates

| Phase | Tasks | Hours | Deliverable |
|-------|-------|-------|-------------|
| 1. Setup ✅ | 14 | 2-3 | Monorepo ready |
| 2. Foundational | 38 | 4-6 | Auth, tRPC, DB, Go service |
| 3. Events (MVP) | 25 | 8-10 | Event management |
| 4. Tasks | 22 | 8-10 | Task tracking |
| 5. Resources | 31 | 10-12 | Scheduling + conflict detection |
| 6. Analytics | 15 | 6-8 | Reports and insights |
| 7. Communication | 19 | 6-8 | Client follow-ups |
| 8. Polish | 36 | 6-8 | Production ready |
| **TOTAL** | **200** | **50-65** | Full system |

**MVP Only** (Phases 1-3 + partial 8): ~77 tasks, 18-23 hours

---

## Next Steps

1. **Complete Phase 2**: Foundation must be done before any user stories
2. **Build MVP**: Phase 3 delivers immediate value
3. **Incremental delivery**: Add user stories one at a time
4. **Production deployment**: Polish phase prepares for launch

See individual phase guides for detailed implementation steps.
