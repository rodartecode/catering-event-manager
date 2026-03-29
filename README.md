# Catering Event Manager

**Production-ready event lifecycle management system** for catering companies - from initial inquiry to post-event follow-up.

**Last updated**: March 29, 2026

## Architecture

**Hybrid Microservices Monorepo**:

- **Next.js 16 Web Application** (`apps/web/`): Main UI, tRPC API, authentication, CRUD operations
- **Go Scheduling Service** (`apps/scheduling-service/`): High-performance resource conflict detection (<100ms)
- **Shared Packages** (`packages/`): Database schemas (Drizzle), TypeScript types, configurations

**Tech Stack**:

- Frontend: Next.js 16.2.1 + React 19.2.3 + Tailwind CSS 4.2.2
- API: tRPC v11.15.1 (type-safe RPC)
- Database: PostgreSQL 17 + Drizzle ORM 0.45.2
- Scheduling: Go 1.25.7 + Fiber v3.1.0 + SQLC 1.27+
- Monorepo: pnpm 10+ + Turborepo 2.7.6
- Testing: Vitest 4.1.2 + Playwright 1.58.0 + TestContainers
- Linting: ESLint 9.39.2 + TypeScript-ESLint 8.57.2
- Validation: Zod 4.3.6

## Quick Start

### Prerequisites

- Node.js 20 LTS
- pnpm 10+
- Go 1.25.7+
- Docker Desktop
- PostgreSQL 17 (or use Docker)

### Setup

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Environment configuration**:

   ```bash
   # Copy environment templates
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env.local
   cp apps/scheduling-service/.env.example apps/scheduling-service/.env

   # Generate secure Next-Auth secret
   openssl rand -base64 32

   # Edit .env files and:
   # - Replace NEXTAUTH_SECRET with the generated secret
   # - Update DATABASE_URL if using different PostgreSQL credentials
   # - Add RESEND_API_KEY for client portal magic link emails
   # - Adjust ports if needed (default: 3000 for web, 8080 for scheduler)
   ```

3. **Start PostgreSQL**:

   **Option A: Docker (recommended)**

   ```bash
   docker-compose up -d postgres
   ```

   **Option B: Local PostgreSQL**

   ```bash
   # Create database (if using local PostgreSQL)
   createdb catering_events

   # Update DATABASE_URL in .env files with your credentials
   ```

4. **Initialize database**:

   ```bash
   cd packages/database
   pnpm db:push    # Applies schema to database
   pnpm db:studio  # Optional: Open Drizzle Studio for DB management
   cd ../..
   ```

5. **Verify setup**:

   ```bash
   # Type checking
   pnpm type-check

   # Linting
   pnpm lint

   # Database connectivity
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM clients;"
   ```

6. **Start services**:

   **Option A: All services via Turborepo**

   ```bash
   pnpm dev
   # Starts Next.js on http://localhost:3000
   # Note: Go service must be started manually (see Option B)
   ```

   **Option B: Manual (separate terminals)**

   ```bash
   # Terminal 1: Next.js web application
   cd apps/web && pnpm dev

   # Terminal 2: Go scheduling service
   cd apps/scheduling-service
   go run cmd/scheduler/main.go
   ```

   **Option C: Docker Compose (all services)**

   ```bash
   docker-compose up
   ```

7. **Access the application**:
   - **Web Dashboard**: <http://localhost:3000>
   - **API Documentation**: See [API.md](API.md)
   - **Health Checks**:
     - Next.js: <http://localhost:3000/api/health>
     - Go Scheduler: <http://localhost:8080/api/v1/health>
     - Database Studio: <http://localhost:4983> (if running)

8. **First-time setup** (optional):

   ```bash
   # Create sample data for testing
   cd packages/database && pnpm db:seed

   # Run tests to verify everything works
   pnpm test

   # Check service health
   curl http://localhost:3000/api/health
   curl http://localhost:8080/api/v1/health
   ```

### Troubleshooting

#### Common Issues

```bash
# Port conflicts
lsof -i :3000  # Check what's using port 3000
lsof -i :8080  # Check what's using port 8080

# Database connection issues
docker-compose logs postgres
psql $DATABASE_URL -c "\dt"  # List tables

# Type errors after schema changes
cd packages/database && pnpm db:push
cd apps/scheduling-service && sqlc generate

# ESLint configuration issues (after Next.js 16 upgrade)
rm -rf node_modules/.cache
pnpm lint

# Dependency issues
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

#### Post-Upgrade Issues

After the recent major package upgrades (Next.js 16, Tailwind 4, Zod 4):

```bash
# If build fails with route conflicts
# Next.js 16 is stricter about duplicate routes
ls -la apps/web/src/app/

# If CSS imports fail
# Tailwind 4 uses new import syntax
grep "@import" apps/web/src/app/globals.css

# If Zod validation errors occur
# Zod 4 changed error structure: .errors → .issues
grep -r "\.errors\[" apps/web/src/
```

## Project Structure

```
catering-event-manager/
├── apps/
│   ├── web/                    # Next.js 16 application
│   │   ├── src/app/           # App Router (Next.js 16)
│   │   ├── src/server/        # tRPC v11 API layer
│   │   └── src/components/    # React 19 components
│   └── scheduling-service/     # Go Fiber v3 service
│       ├── internal/          # Go business logic
│       ├── sql/               # SQLC queries
│       └── cmd/               # Entry points
├── packages/
│   ├── database/              # Drizzle ORM 0.45.2 schemas
│   ├── types/                 # Shared TypeScript types
│   └── config/                # Shared configs (ESLint, Tailwind, TS)
├── specs/                     # Feature specifications
├── docs/                      # Project documentation
├── docker-compose.yml         # Development stack
├── docker-compose.prod.yml    # Production stack
├── turbo.json                 # Turborepo configuration
└── pnpm-workspace.yaml        # pnpm workspace config
```

## Development

```bash
# Development servers
pnpm dev

# Build all packages
pnpm build

# Type checking (ESLint 9 + TypeScript-ESLint 8)
pnpm type-check

# Linting (updated for Next.js 16)
pnpm lint

# Code formatting (Biome 2.4.9)
pnpm format

# Database operations
pnpm db:generate   # Generate migrations
pnpm db:migrate    # Apply migrations
pnpm db:studio     # Open Drizzle Studio
pnpm db:seed       # Seed database with sample data
```

## Testing

Comprehensive testing infrastructure with PostgreSQL TestContainers for isolated database tests:

### TypeScript Tests (Vitest 4.1.2)

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Interactive test UI
pnpm test:ui

# Coverage report
pnpm test:coverage
```

**Test Results** (as of March 18, 2026):

- ✅ **943 tests passing** across 53 test files
- ✅ **14 tRPC routers fully tested** (event, task, resource, document, expense, invoice, payment, menu, clients, analytics, user, portal, template, search)
- ✅ **19 React component test suites** covering auth, events, tasks, resources, clients, analytics, dashboard
- ✅ Complete test infrastructure with PostgreSQL TestContainers
- ✅ Zero breaking changes after Zod 4 upgrade (all error handling updated)

### Go Tests

```bash
cd apps/scheduling-service

# Run all Go tests
go test ./...

# Verbose output
go test -v ./internal/scheduler/...

# With coverage
go test -cover ./...

# Benchmarks (performance tests)
go test -bench=. ./internal/scheduler
```

**Test Results**:

- ✅ **46 tests passing** (0 failures)
- ✅ **Coverage: scheduler 91.7%, api 88.3%, domain 100%**
- ✅ All critical conflict detection algorithms fully tested
- ✅ Test infrastructure: PostgreSQL TestContainers + testify

**Test Files**:

- `conflict_test.go` - 14 comprehensive conflict detection tests
- `availability_test.go` - 8 availability service tests
- `handlers_test.go` - 11 HTTP API integration tests
- `errors_test.go` - 5 domain error tests
- `testutil/` - Test infrastructure (containers + fixtures)

### E2E Tests (Playwright 1.58.0)

```bash
cd apps/web

# Run E2E tests
pnpm test:e2e

# Interactive mode with browser UI
pnpm test:e2e:ui
```

### Test Architecture

- **tRPC Router Tests**: Integration tests with real PostgreSQL TestContainers (✅ Complete)
- **Go Service Tests**: Unit/integration tests for scheduling algorithms (✅ Complete)
- **Component Tests**: Unit tests with mocked tRPC hooks (✅ **Complete**)
- **E2E Tests**: Full workflow validation with Playwright (⚠️ Infrastructure ready)

**Coverage achieved**:

- **tRPC routers**: 600+ tests across 14 routers
- **React components**: 232+ tests across 19+ component files
- **Go scheduler**: 91.7% coverage (exceeds 80% target)
- **Critical algorithms**: 100% tested (conflict detection, availability)

### Quality Gates (Visual, Accessibility, Performance)

Automated quality checks for key pages to ensure visual consistency, accessibility compliance, and performance standards.

```bash
# Run quality gate tests
pnpm test:quality

# Update visual baselines after intentional UI changes
pnpm test:quality:update
```

**Tested Pages**:
- `/login` - Public entry point (unauthenticated)
- `/` (dashboard) - Main protected page with charts/stats
- `/events` - Event list with filters and pagination
- `/clients` - Client list with search and follow-up banners

**Quality Criteria**:
- **Visual Regression**: <1% pixel difference from baseline screenshots
- **Accessibility**: WCAG 2.1 AA compliance (zero critical/serious violations via axe-core)
- **Performance**: Core Web Vitals - LCP < 3000ms, CLS < 0.15

**CI Behavior**: Quality gates run as advisory job (`continue-on-error: true`) - failures are visible but don't block PRs.

**Test Files**: `apps/web/test/e2e/quality-gates/*.quality.ts`

## Features

✅ **Production-Ready Event Lifecycle Management System**

### Core Features (All Phases Complete)

- **🎯 Event Management** - Complete lifecycle: inquiry → planning → preparation → in-progress → completed → follow-up
- **📋 Task Management** - Assignment, completion tracking, dependency management, overdue detection
- **👥 Resource Scheduling** - Staff/equipment scheduling with automated conflict detection (sub-100ms)
- **📊 Analytics & Reporting** - Event completion rates, resource utilization, task performance with CSV export capability
- **💬 Client Communication** - Communication history, follow-up scheduling, overdue notifications
- **💰 Financial Management** - Expenses, invoicing with PDF export, payments with auto-status transitions, profitability analytics
- **🍽️ Menu Planning** - Global menu item catalog, per-event menus with dietary tracking, cost estimation, cross-event shopping lists
- **📎 Document Management** - File uploads via Supabase Storage (contracts, menus, floor plans, permits, photos) with client portal sharing
- **🔐 Role-Based Authentication** - Administrator/Manager/Client roles with Next-Auth v5
- **🏢 Client Portal** - Magic link authentication for clients to view their events, documents, and status

### Technical Capabilities

- **Near-Real-Time Updates** - Automatic data polling every 5 seconds until subscription infrastructure is implemented
- **Conflict Detection** - High-performance Go service with PostgreSQL GiST indexes for O(log n) scheduling queries
- **Type-Safe APIs** - End-to-end type safety with tRPC v11 and SQLC code generation
- **Responsive Dashboard** - Modern React 19 + Tailwind CSS 4 interface with mobile support
- **Data Export** - CSV export infrastructure for all analytics reports
- **Audit Trail** - Complete event status change history with timestamps and user tracking
- **Edge Runtime Compatible** - Web Crypto API for magic link token generation
- **Production Monitoring** - Health checks, structured logging, error boundaries

## Implementation Status

### 🎉 Production Ready - All Phases Complete (100%)

- ✅ Phase 1: Project Setup & Infrastructure (Monorepo, Docker, CI/CD)
- ✅ Phase 2: Foundational (Database, Auth, tRPC, Go microservice)
- ✅ Phase 3: Event Management (CRUD, status lifecycle, archiving)
- ✅ Phase 4: Task Management (Assignment, dependencies, completion tracking)
- ✅ Phase 5: Resource Scheduling (Conflict detection, availability, optimization)
- ✅ Phase 6: Analytics & Reporting (Metrics, charts, CSV export)
- ✅ Phase 7: Client Communication (Follow-ups, portal, magic links)
- ✅ Phase 8: Testing Infrastructure & Production Polish

### 📊 Current Implementation Metrics

- **14 tRPC API routers** with 97 procedures (fully tested)
- **21 database tables** with optimized indexes (PostgreSQL 17)
- **~100 React components** across 14 feature areas
- **5 main dashboard sections** (Events, Tasks, Resources, Clients, Analytics)
- **Complete testing infrastructure** (Vitest + TestContainers + Playwright)
- **Full CRUD operations** for all entities
- **Production-ready authentication** and client portal
- **Real-time analytics** with caching optimization

See [specs/001-event-lifecycle-management/tasks.md](specs/001-event-lifecycle-management/tasks.md) for detailed task breakdown.

## Production Deployment

### Live Environment

The application is deployed across three managed platforms:

| Service | Platform | URL |
|---------|----------|-----|
| Web App | Vercel | [catering-dev.vercel.app](https://catering-dev.vercel.app) |
| Scheduler | Fly.io | [catering-scheduler-dev.fly.dev](https://catering-scheduler-dev.fly.dev) |
| Database | Supabase | PostgreSQL 17.6 (us-west-2) |

**Deployment workflow**:
- **Web**: Push to `main` → Auto-deploys to Vercel
- **Scheduler**: `cd apps/scheduling-service && fly deploy`
- **Database**: Managed via Supabase Dashboard

For detailed deployment commands, environment variables, and troubleshooting, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Docker Production Setup

**Multi-stage Dockerfiles** for optimized production builds:

```bash
# Build and run production stack
POSTGRES_PASSWORD=your-secure-password docker-compose -f docker-compose.prod.yml up

# Or build images individually
docker build -t catering-web apps/web
docker build -t catering-scheduler apps/scheduling-service
```

**Production features:**

- ✅ Multi-stage builds with Alpine Linux (minimal image size)
- ✅ Non-root users for security
- ✅ Health checks for all services (30-second intervals)
- ✅ Security headers (X-Frame-Options, CSP, CSRF protection)
- ✅ Standalone Next.js output for containerization
- ✅ Go binary optimization with CGO disabled
- ✅ Environment-based configuration

### Environment Variables

**Required variables**:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"
NEXTAUTH_SECRET="32-char-secret"  # openssl rand -base64 32
NEXTAUTH_URL="https://your-domain.com"
SCHEDULING_SERVICE_URL="http://scheduler:8080"
RESEND_API_KEY="re_..."  # For client portal emails
EMAIL_FROM="noreply@your-domain.com"
```

**Optional variables**:

```bash
NODE_ENV="production"
LOG_LEVEL="info"
ANALYTICS_CACHE_TTL="300"
CONFLICT_CACHE_TTL="30"
```

### Health Monitoring

```bash
# Check all services health
curl https://your-domain.com/api/health          # Next.js app
curl https://scheduler.your-domain.com/api/v1/health  # Go scheduler
pg_isready -h db-host -p 5432                   # PostgreSQL

# Docker health checks
docker-compose ps  # Shows health status
```

### Error Handling

**Production error pages:**

- [`apps/web/src/app/error.tsx`](apps/web/src/app/error.tsx) - Global error boundary with recovery
- [`apps/web/src/app/not-found.tsx`](apps/web/src/app/not-found.tsx) - Custom 404 page

**Error monitoring:**

- Structured logging with error IDs for tracing
- User-friendly error messages with technical details hidden
- Graceful degradation when Go service unavailable
- Recovery options (try again, return home, contact support)

### Database Management

```bash
# Production database migration
cd packages/database
DATABASE_URL="postgresql://prod-user:pass@prod-host:5432/db" pnpm db:migrate

# Seed production database with sample data (optional)
DATABASE_URL="your-production-db-url" pnpm db:seed

# Database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

**Demo Data & Login Credentials:**

Production database includes complete demo data for testing:

- **Admin Account**: `admin@example.com` / `password123` (full access)
- **Manager Account**: `manager@example.com` / `password123` (limited access)
- **Client Portal**: `jane.smith@acme.test` (magic link authentication)
- **Sample Data**: 3 clients, 5 events, 10 tasks, 5 resources, communication history

**Live Demo**: [catering-event-manager.vercel.app](https://catering-event-manager.vercel.app)

### Performance Optimization

**Caching Strategy**:
- Analytics queries: 5-minute cache (meets SC-005 <10s requirement)
- Resource conflicts: 30-second cache (high-performance requirement)
- Follow-up checks: 1-hour cache

**Database Optimization**:
- GiST indexes on time-range queries for O(log n) conflict detection
- Composite indexes on frequently filtered columns
- Query optimization in Go service (<100ms target)

## Security

### Rate Limiting

**Next.js API (tRPC)**:

- General API: 100 requests/minute per IP
- Auth endpoints: 5 requests/minute per IP (brute-force protection)
- Magic link requests: 3 requests/5 minutes per email

**Go Scheduling Service**:

- Global limit: 200 requests/minute per IP

Rate limit headers included in responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

For production, configure Upstash Redis for distributed rate limiting:

```bash
UPSTASH_REDIS_REST_URL="your-upstash-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

### CSRF Protection

- **Next-Auth v5**: Built-in double-submit cookie pattern
- **Session cookies**: `SameSite=Lax`, `HttpOnly`, `Secure` (production)
- **Origin validation**: tRPC mutations reject requests from unauthorized origins

### Security Headers

All responses include:

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | Restrictive CSP | XSS mitigation |
| X-Frame-Options | DENY | Clickjacking protection |
| X-Content-Type-Options | nosniff | MIME sniffing prevention |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer leak protection |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Feature restrictions |

**CSP Directives**:

- `default-src 'self'` - Only allow same-origin resources
- `script-src 'self' 'unsafe-inline'` - Required for Next.js
- `style-src 'self' 'unsafe-inline'` - Required for Tailwind CSS
- `frame-ancestors 'none'` - Prevent embedding in iframes
- `form-action 'self'` - Restrict form submissions

### Security Checklist

Before production deployment:

- [ ] Generate unique `NEXTAUTH_SECRET` (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `NEXTAUTH_URL` with HTTPS domain
- [ ] Set up Upstash Redis for distributed rate limiting
- [ ] Review CSP for any required external resources
- [ ] Test security headers at [securityheaders.com](https://securityheaders.com/)

## Recent Updates (March 19, 2026)

### Menu Planning (March 19)

- Global menu item catalog with categories, allergens (free-text), and dietary tags (enum)
- Per-event named menus (e.g., "Cocktail Hour", "Dinner Service") with item management
- Cost estimation based on attendees with quantity overrides
- Dietary restriction summary and cross-event shopping list aggregation
- Client portal read-only menu view
- 15 new tRPC procedures + 1 portal procedure, 41 new router tests

### Document Management (March 18)

- File uploads attached to events via Supabase Storage with presigned URLs
- Drag-and-drop upload dialog, client portal document sharing
- 6 new tRPC procedures + 2 portal procedures
- 20 new router tests + auth matrix coverage

### Financial Layer (March 16)

- Complete expense tracking, invoicing with PDF export, payment recording
- Auto-status transitions (paid when payments cover total)
- Profitability analytics: `financialSummary` and `eventProfitability` endpoints
- 3 new routers (expense, invoice, payment) with 15 procedures

### Security Hardening (March 15)

- Row Level Security enabled on all public tables
- Advanced search with full-text ILIKE across all entities
- Dependency updates: testcontainers-go v0.41.0, jsdom 28.0.0

### Infrastructure & DevOps Hardening (February 8-9)

- Upgraded Go to 1.25.7, Fiber to v3.0.0 stable, Biome to 2.3.14 (since bumped to 2.4.9)
- Added staging environment (Vercel + Fly.io + Supabase)
- Configured Dependabot for automated dependency updates

### Major Package Upgrades (January 25, 2026)

| Package | Previous | Current |
|---------|----------|---------|
| Next.js | 15.5.6 | **16.2.1** |
| React | 18.x | **19.2.3** |
| Tailwind CSS | 3.4.18 | **4.2.2** |
| Zod | 3.25.76 | **4.3.6** |
| tRPC | 11.7.x | **11.15.1** |
| Drizzle ORM | 0.36.4 | **0.45.2** |
| ESLint | 8.x | **9.39.2** |
| Biome | 1.9.4 | **2.4.9** |
| Vitest | 3.x | **4.1.2** |
| Go | 1.24.0 | **1.25.7** |
| Fiber | v3-beta.3 | **v3.1.0** |

## License

Private - All Rights Reserved

---

**For detailed API documentation**: [API.md](API.md)
**For contributing guidelines**: [CONTRIBUTING.md](CONTRIBUTING.md)
**For technical context**: [CLAUDE.md](CLAUDE.md)