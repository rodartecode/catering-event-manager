# Project Context

## Purpose

**Catering Event Lifecycle Management System** - A hybrid microservices monorepo for managing catering events from initial inquiry to post-event follow-up, with automated resource conflict detection.

Key goals:
- Track events through complete lifecycle: inquiry → planning → preparation → in_progress → completed → follow_up
- Manage tasks, resources (staff/equipment/materials), and client communications
- Detect resource scheduling conflicts in real-time (<100ms)
- Provide analytics and reporting for business insights
- Support 50+ concurrent events without performance degradation

## Tech Stack

### Frontend & API
- **Next.js 15** with App Router
- **React 19**
- **TypeScript** (strict mode)
- **tRPC v11** for type-safe API layer
- **Tailwind CSS** for styling
- **Next-Auth v5** for session-based authentication

### Backend Services
- **Go 1.23+** scheduling service with Fiber v3
- **SQLC** for type-safe Go database queries

### Database
- **PostgreSQL 17**
- **Drizzle ORM** for TypeScript schema definitions and migrations

### Build & Tooling
- **Turborepo** for monorepo orchestration
- **pnpm 10+** for package management
- **Biome** for formatting and linting
- **ESLint** for additional linting rules
- **Docker Compose** for local development

### Testing
- **Vitest** for TypeScript unit/integration tests
- **Go test** for Go service tests
- **Playwright** for E2E tests

## Project Conventions

### Code Style

- **Formatting**: Biome handles formatting automatically (`pnpm format`)
- **Linting**: ESLint + Biome (`pnpm lint`)
- **Type checking**: Strict TypeScript (`pnpm type-check`)
- **Naming conventions**:
  - Files: kebab-case for files, PascalCase for React components
  - Variables/functions: camelCase
  - Types/interfaces: PascalCase
  - Database columns: snake_case
  - Enums: snake_case values in database, mapped to TypeScript

### Architecture Patterns

**Hybrid Microservices**:
- Next.js handles CRUD operations, authentication, UI rendering, analytics
- Go service handles resource conflict detection (performance-critical, ~100ms requirement)
- Both services share the same PostgreSQL database

**Domain-Driven Organization**:
- Files organized by domain (events, tasks, resources), NOT by technical layers
- tRPC routers are domain-specific (e.g., `event.ts`, `task.ts`)

**Type Safety End-to-End**:
- Frontend ↔ Next.js: tRPC provides compile-time type checking
- Next.js ↔ Database: Drizzle ORM provides typed queries
- Go ↔ Database: SQLC generates type-safe Go structs from SQL

**Soft Delete Pattern**:
- Events are archived (soft deleted), not permanently deleted
- `is_archived` boolean + `archived_at` timestamp
- Queries filter archived records by default

**Status Change Logging**:
- All event status transitions recorded in `event_status_log` table
- Enables audit trail and timeline visualization

### Logging & Observability (OBS-001, OBS-002)

**Structured JSON logging** via `@/lib/logger`:

```typescript
import { logger } from '@/lib/logger';

// Always include context for traceability
logger.info('Operation completed', { context: 'sendEmail', messageId });
logger.warn('Fallback activated', { context: 'rateLimit', reason: 'Redis unavailable' });
logger.error('Operation failed', error, { context: 'assignResources', taskId, resourceIds });
```

**Rules:**
- **Never `console.*`** in production code (ESLint enforces)
- **Include context metadata**: operation name, entity IDs, error codes
- **Sanitize sensitive data**: No full emails, passwords, or tokens in logs
- **Pass Error objects**: Preserves stack traces for debugging

### Input Sanitization (DQ-001)

All Zod input schemas apply normalization:

```typescript
// Strings: trim whitespace to prevent "Staff" vs "Staff " duplicates
name: z.string().trim().min(1).max(255)

// Emails: lowercase + trim for consistent matching
email: z.string().trim().toLowerCase().email()
```

### Testing Strategy

- **Coverage target**: >80% overall, 100% for scheduling algorithms
- **Test organization**: Co-located with source files (`*.test.ts` next to `*.ts`)
- **Unit tests**: Vitest for TypeScript, `go test` for Go
- **E2E tests**: Playwright for critical user flows
- **Contract tests**: tRPC procedures tested against expected types

### Git Workflow

- **Branch naming**: Feature branches (e.g., `001-event-lifecycle-management`)
- **Commits**: Conventional commit format (`feat:`, `fix:`, `docs:`, etc.)
- **Main branch**: Protected, requires passing tests
- **PR workflow**: Feature branch → PR → Code review → Merge

## Domain Context

### Event Lifecycle States

Events progress through a standard lifecycle:
1. **inquiry** - Initial client contact
2. **planning** - Event details being finalized
3. **preparation** - Tasks being completed before event
4. **in_progress** - Event currently happening
5. **completed** - Event finished
6. **follow_up** - Post-event client communication

### User Roles

- **Administrator**: Full access (create/edit/delete all entities)
- **Manager**: Read-only + update task status + assign resources

### Resource Types

- **Staff**: Employees assigned to events
- **Equipment**: Physical items (tables, chairs, AV equipment)
- **Materials**: Consumables (food, decorations)

### Key Business Processes

1. Client submits inquiry → Event created in "inquiry" status
2. Staff finalizes details → Event moves to "planning"
3. Tasks created and assigned → Event moves to "preparation"
4. Event day arrives → Event moves to "in_progress"
5. Event concludes → Event moves to "completed"
6. Follow-up communications → Event moves to "follow_up" then archived

## Important Constraints

### Performance Requirements (Success Criteria)

| Metric | Target | Code |
|--------|--------|------|
| Event creation time | <5 minutes | SC-001 |
| Status update visibility | <2 seconds | SC-004 |
| Report generation | <10 seconds | SC-005 |
| Resource conflict detection | <100ms | Architecture |
| Concurrent events | 50+ without degradation | SC-007 |
| Uptime during business hours | >99.5% | SC-010 |

### Technical Constraints

- Node.js 20 LTS required
- Go 1.23+ required
- PostgreSQL 17 required (uses GiST indexes for time range queries)
- pnpm 10+ required (not npm or yarn)

### Security Constraints

- Session-based authentication (Next-Auth v5)
- Role-based access control (Admin/Manager)
- No secrets in code (use environment variables)
- Parameterized queries only (no SQL injection)

## External Dependencies

### Required Services

- **PostgreSQL 17**: Primary database (via Docker Compose locally)

### Internal Service Communication

- **Next.js ↔ Go Scheduler**: HTTP REST calls for conflict detection
- **SSE**: Server-Sent Events for real-time status updates

### Environment Variables

```bash
DATABASE_URL          # PostgreSQL connection string
NEXTAUTH_SECRET       # Session encryption secret
NEXTAUTH_URL          # Application URL
SCHEDULING_SERVICE_URL # Go service URL (default: http://localhost:8080)
```
