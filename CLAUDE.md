
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Catering Event Lifecycle Management System** - Hybrid microservices monorepo for managing catering events from initial inquiry to post-event follow-up, with automated resource conflict detection.

**Architecture**:
- Next.js 16 app (CRUD, auth, UI) + Go scheduling service (resource conflicts)
- Shared PostgreSQL 17 database with Drizzle ORM (TypeScript) and SQLC (Go)
- Type-safe end-to-end via tRPC v11 and SQLC compile-time generation

## Essential Commands

### Development

```bash
# First-time setup
pnpm install
docker-compose up -d postgres
cd packages/database && pnpm db:push && cd ../..

# Start all services
pnpm dev                    # Next.js app on :3000 (Turborepo)

# Or start individually (separate terminals)
cd apps/web && pnpm dev     # Next.js app on :3000
cd apps/scheduling-service && go run cmd/scheduler/main.go  # Go service on :8080

# Docker Compose (all services)
docker-compose up           # PostgreSQL + Next.js + Go scheduler
docker-compose up -d postgres  # Just PostgreSQL
```

### Database Operations

```bash
# All commands from packages/database/
cd packages/database

pnpm db:generate   # Generate Drizzle migrations from schema changes
pnpm db:push       # Push schema directly to DB (dev only, no migration files)
pnpm db:migrate    # Apply pending migrations to database
pnpm db:studio     # Launch Drizzle Studio GUI on :4983

# Connect to PostgreSQL directly
psql postgresql://admin:changeme@localhost:5432/catering_events
```

### Code Quality

```bash
pnpm lint          # ESLint + Biome linting
pnpm type-check    # TypeScript type checking across all packages
pnpm format        # Format code with Biome
pnpm format:check  # Check formatting without writing
pnpm test          # Run all tests (Vitest + Go tests)
```

### Building

```bash
pnpm build         # Build all apps and packages (Turborepo)
pnpm clean         # Remove all build artifacts and node_modules
```

### Go Service Commands

```bash
cd apps/scheduling-service

# Development
go run cmd/scheduler/main.go
go build -o bin/scheduler cmd/scheduler/main.go && ./bin/scheduler

# Testing
go test ./...
go test -v ./internal/scheduler/...

# Generate SQL from SQLC
sqlc generate      # Regenerate type-safe Go code from SQL queries
```

## Architecture & Structure

### Monorepo Layout

```
apps/
├── web/                           # Next.js 16 application
│   ├── src/app/                   # App Router pages (Next.js 16)
│   ├── src/server/                # tRPC API layer
│   │   ├── routers/               # Domain-organized tRPC routers
│   │   │   ├── _app.ts            # Root router combining all domain routers
│   │   │   └── event.ts           # Event management procedures (✅ implemented)
│   │   ├── trpc.ts                # tRPC initialization + context
│   │   └── auth.ts                # Next-Auth v5 configuration
│   └── src/lib/                   # Client utilities and hooks
│
└── scheduling-service/            # Go Fiber service
    ├── cmd/scheduler/main.go      # Entry point
    ├── internal/
    │   ├── scheduler/             # Conflict detection algorithms
    │   ├── handlers/              # HTTP handlers (Fiber v3)
    │   └── database/              # SQLC-generated code
    └── sql/                       # SQL queries for SQLC

packages/
├── database/                      # Shared Drizzle ORM schemas
│   ├── src/schema/                # Database table definitions
│   │   ├── users.ts               # User accounts + roles
│   │   ├── clients.ts             # Client records
│   │   ├── events.ts              # Event lifecycle tracking
│   │   ├── tasks.ts               # Task management
│   │   ├── resources.ts           # Staff/equipment/materials
│   │   └── index.ts               # Schema exports
│   └── src/migrations/            # Generated migration files
│
├── types/                         # Shared TypeScript types
│   └── src/                       # Zod schemas and type definitions
│
└── config/                        # Shared configurations
    ├── typescript-config/         # Base tsconfig.json
    ├── eslint-config/             # Shared ESLint rules
    └── tailwind-config/           # Tailwind CSS presets
```

### Key Architectural Patterns

#### Hybrid Microservices
- **Next.js App**: Handles CRUD operations, authentication, UI rendering, analytics
- **Go Scheduler**: Handles resource conflict detection (performance-critical, ~100ms requirement)
- **Why Split**: Go service provides 7-11x faster scheduling algorithms than Node.js, critical for SC-003 (100% conflict detection)

#### Domain-Driven Organization
Files are organized by **domain** (events, tasks, resources), NOT by technical layers (controllers, services, repositories).

Example tRPC router structure:
```typescript
// apps/web/src/server/routers/event.ts
export const eventRouter = router({
  create: adminProcedure.input(...).mutation(...),
  list: protectedProcedure.input(...).query(...),
  updateStatus: adminProcedure.input(...).mutation(...),
  archive: adminProcedure.input(...).mutation(...),
});
```

#### Database Schema Sharing
- **Drizzle ORM** (`packages/database/`): TypeScript schema definitions, migrations
- **SQLC** (Go service): Reads same PostgreSQL schema, generates type-safe Go code
- Both services access same `public` schema in PostgreSQL 17

#### Type Safety End-to-End
- **Frontend ↔ Next.js**: tRPC v11 provides compile-time type checking
- **Next.js ↔ Database**: Drizzle ORM provides typed queries
- **Go ↔ Database**: SQLC generates type-safe Go structs from SQL at compile time
- **Result**: Refactoring a database column causes TypeScript AND Go compile errors

### Authentication & Authorization

**Next-Auth v5** with session-based authentication:
- **Administrator**: Full access (create/edit/delete all entities)
- **Manager**: Read-only + update task status + assign resources

Protected tRPC procedures:
```typescript
export const protectedProcedure = t.procedure.use(requireAuth);      // Any logged-in user
export const adminProcedure = t.procedure.use(requireAdmin);         // Administrators only
```

### Real-Time Updates

Event status changes use **Server-Sent Events** (SSE) to push updates to connected clients:
- tRPC subscriptions for real-time event/task status changes
- Target: Updates visible within 2 seconds (SC-004)

### Archive Strategy

Events are **soft deleted** (archived), not permanently deleted:
- `events.is_archived = true` + `archived_at` timestamp
- Preserves historical data for analytics (SC-009)
- Queries filter archived events by default unless explicitly requested

### Logging Best Practices

Use the structured `logger` utility (`@/lib/logger`) for all server-side logging:

```typescript
import { logger } from '@/lib/logger';

// Info level - operational events
logger.info('Email sent successfully', { messageId: 'abc123', context: 'sendWelcome' });

// Warn level - recoverable issues
logger.warn('Redis unavailable, using in-memory fallback', { context: 'rateLimit' });

// Error level - failures with stack traces
logger.error('Email send failed', error, {
  context: 'sendMagicLink',
  recipientDomain: email.split('@')[1],
});
```

**Guidelines:**
- **Never use `console.log/error/warn`** in production code (ESLint will warn)
- **Include context metadata**: operation name, entity IDs (sanitized), error codes
- **Sanitize sensitive data**: Log domains not full emails, truncate long arrays
- **Error objects**: Pass actual Error instances to preserve stack traces
- **Client-side exception**: `app/error.tsx` boundary uses console (documented)

**Log output format** (JSON, parseable by log aggregators):
```json
{"timestamp":"2026-02-01T05:24:58.745Z","level":"error","message":"Get resource schedule failed","context":{"resourceId":1,"code":"TIMEOUT","error":{"message":"Timeout","stack":"..."}}}
```

## Testing Strategy

### TypeScript Tests (Vitest)

```bash
# Run from root
pnpm test

# Run specific package
cd apps/web && pnpm test

# Watch mode
cd apps/web && pnpm test:watch

# Run single test file
cd apps/web && pnpm test src/server/routers/event.test.ts

# Run with coverage
cd apps/web && pnpm test:coverage
```

**Test organization**:
```
apps/web/
├── src/
│   ├── server/routers/
│   │   ├── event.test.ts         # Router unit tests (co-located)
│   │   ├── task.test.ts
│   │   ├── resource.test.ts
│   │   ├── clients.test.ts
│   │   └── ...
│   ├── components/**/*.test.tsx   # Component tests (co-located)
│   └── lib/**/*.test.ts           # Utility tests (co-located)
├── test/
│   ├── helpers/
│   │   ├── db.ts                  # Testcontainers PostgreSQL setup
│   │   ├── trpc.ts                # Test caller factories (admin, manager, client, unauthenticated)
│   │   ├── factories.ts           # Test data factories (createEvent, createTask, etc.)
│   │   └── input-factories.ts     # Auth matrix data + procedure input generators
│   ├── scenarios/
│   │   ├── event-lifecycle.test.ts        # Event state machine scenario tests
│   │   ├── task-dependencies.test.ts      # Task dependency chain scenarios
│   │   ├── resource-conflicts.test.ts     # Resource conflict scenarios (mocked Go service)
│   │   └── client-communication.test.ts   # Communication workflow scenarios
│   ├── integration/
│   │   ├── setup.ts               # Go service build/start/stop helpers
│   │   └── cross-service.test.ts  # Real Go service integration tests
│   ├── auth-matrix.test.ts        # Authorization boundary matrix (~97 cases)
│   └── setup.ts                   # Global test setup
```

### Cross-Service Integration Tests

```bash
# Requires Go 1.24+ toolchain installed
cd apps/web && pnpm test:integration
```

These tests build and spawn the real Go scheduling service against a Testcontainers PostgreSQL instance. They verify end-to-end behavior between tRPC routers and the Go conflict detection service without mocks.

### Go Tests

```bash
cd apps/scheduling-service
go test ./...                   # All tests
go test -v ./internal/scheduler/...  # Specific package with verbose output
go test -cover ./...            # With coverage
```

**Test files**: `*_test.go` next to implementation files

### E2E Tests (Playwright)

```bash
cd apps/web
pnpm test:e2e                   # Run E2E tests
pnpm test:e2e:ui                # With Playwright UI
```

**Coverage targets**: >80% overall, 100% for scheduling algorithms (critical business logic)

### Quality Gates (Visual, Accessibility, Performance)

Quality gates validate visual consistency, WCAG 2.1 AA accessibility compliance, and Core Web Vitals performance budgets for key pages.

```bash
cd apps/web
pnpm test:quality               # Run quality gate tests
pnpm test:quality:update        # Update visual baselines after intentional UI changes
```

**What's tested** (4 pages):
- `/login` - Public entry point (unauthenticated)
- `/` (dashboard) - Main protected page with charts/stats
- `/events` - Event list with filters and pagination
- `/clients` - Client list with search and follow-up banners

**Each page validates**:
- **Visual regression**: Screenshot comparison (1% pixel diff threshold)
- **Accessibility**: WCAG 2.1 AA compliance via axe-core (critical/serious violations fail)
- **Performance**: Core Web Vitals - LCP < 3s, CLS < 0.15

**Updating baselines**: After intentional UI changes, run `pnpm test:quality:update` to regenerate baseline screenshots, then commit the updated `.png` files in `test/e2e/quality-gates/`.

**CI behavior**: Quality gates run as an advisory job (`continue-on-error: true`) - failures are visible but don't block PRs. This allows incremental adoption while maintaining visibility.

**Test files**: `apps/web/test/e2e/quality-gates/*.quality.ts`

## Implementation Guides

Comprehensive step-by-step guides located in `docs/implementation-guides/`:

- **PHASE-2-FOUNDATIONAL.md**: Database schema, auth, tRPC setup, Go service foundation
- **PHASE-3-USER-STORY-1.md**: Event management MVP (create, track, status updates)
- **PHASES-4-8-OVERVIEW.md**: Task management, resource scheduling, analytics, client communication

Each guide includes exact file paths, complete code examples, and verification commands.

## Directory-Specific Context

For focused guidance on specific areas of the codebase:

### Application Contexts
- **`apps/web/CLAUDE.md`** - Next.js application patterns, tRPC routers, components, testing
- **`apps/scheduling-service/CLAUDE.md`** - Go service patterns, Fiber routing, scheduling algorithms

### Package Contexts
- **`packages/database/CLAUDE.md`** - Drizzle schemas, migrations, database patterns
- **`packages/types/CLAUDE.md`** - Shared types, Zod validation patterns

### Additional Contexts
- **`docs/CLAUDE.md`** - Documentation standards, ADRs, implementation guides
- **`specs/001-event-lifecycle-management/CLAUDE.md`** - Feature spec structure, task tracking

These files provide targeted context for working efficiently in each area while avoiding duplication of project-wide guidance covered in this root CLAUDE.md.

## Session Context

**At session start**, read these files to avoid re-learning known issues:

1. **`docs/learnings.md`** - Accumulated debugging patterns, gotchas, and solutions
2. **`docs/decisions/`** - Architecture Decision Records explaining "why we chose X"

**During development**, when you discover a non-obvious solution or gotcha:

- Append to `docs/learnings.md` under the appropriate category
- Use the Problem/Solution/Context format with date heading
- Example:
  ```markdown
  ### [2026-01-23] Brief title
  **Problem**: What went wrong
  **Solution**: What fixed it
  **Context**: When this applies
  ```

## Database Schema Key Concepts

### Event Lifecycle States

Events progress through standard lifecycle (Drizzle enum):
```typescript
export const eventStatusEnum = pgEnum('event_status', [
  'inquiry',      // Initial client contact
  'planning',     // Event details being finalized
  'preparation',  // Tasks being completed
  'in_progress',  // Event currently happening
  'completed',    // Event finished
  'follow_up'     // Post-event client communication
]);
```

### Status Change Logging

All status transitions are recorded in `event_status_log` table:
- Captures: previous status, new status, timestamp, user who made change
- Enables audit trail and timeline visualization (FR-003)

### Resource Conflict Detection

Go service uses **GiST indexes** for efficient time range queries:
```sql
CREATE INDEX idx_resources_time_range ON resource_assignments
USING GIST (tsrange(start_time, end_time));
```

Detects overlapping assignments in <100ms (SC-003 requirement).

## Environment Variables

Required `.env` files (copy from `.env.example`):

```bash
# Root .env
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Generate unique secret
NEXTAUTH_URL="http://localhost:3000"
SCHEDULING_SERVICE_URL="http://localhost:8080"

# apps/web/.env.local (same as above)
# apps/scheduling-service/.env
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
PORT=8080
```

**Never commit** `.env.local` or `.env` files (only `.env.example` is tracked).

## Tech Stack Versions

- **Node.js**: 20 LTS
- **pnpm**: 10+
- **Go**: 1.24.0+
- **PostgreSQL**: 17
- **Next.js**: 16.1+
- **React**: 19.2+
- **Tailwind CSS**: 4.1+
- **tRPC**: v11.8+
- **Drizzle ORM**: 0.45+
- **Zod**: 4.3+
- **Fiber**: v3 (Go)
- **SQLC**: 1.27+
- **Vitest**: 4.0+
- **ESLint**: 9.39+

## Implementation Status

**Phase 1**: ✅ Complete - Monorepo structure, dependencies, Docker Compose
**Phase 2**: ✅ Complete - Database schema, auth, tRPC, Go service foundation
**Phase 3**: 🎯 In Progress - Event management (create, track, status updates, archive)

See `specs/001-event-lifecycle-management/tasks.md` for detailed task breakdown (200 tasks across 8 phases).

## Troubleshooting

### PostgreSQL Connection Issues
```bash
docker-compose ps postgres              # Check if running
docker-compose logs postgres            # View logs
docker-compose restart postgres         # Restart database
psql $DATABASE_URL -c "\dt"            # Test connection + list tables
```

### Port Conflicts
```bash
lsof -i :3000                          # Check what's using Next.js port
lsof -i :8080                          # Check what's using Go service port
kill -9 <PID>                          # Kill conflicting process
```

### Dependency Issues
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install                           # Clean reinstall
pnpm store prune                       # Clear pnpm cache
```

### Type Errors After Schema Changes
```bash
cd packages/database
pnpm db:generate                       # Regenerate Drizzle types
cd ../../apps/scheduling-service
sqlc generate                          # Regenerate Go types
pnpm type-check                        # Verify TypeScript types
```

## Performance Goals (Success Criteria)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event creation time | <5 minutes | SC-001 |
| Status update visibility | <2 seconds | SC-004 |
| Report generation | <10 seconds | SC-005 |
| Resource conflict detection | <100ms | (not in SC, architecture requirement) |
| Concurrent events | 50+ without degradation | SC-007 |
| Uptime during business hours | >99.5% | SC-010 |

## Constitution Principles

This project follows 6 core principles (see `.specify/constitution.md`):

1. **Technology Excellence**: Latest stable versions, modern patterns (React 19, tRPC v11, Drizzle)
2. **Modular Architecture**: Domain organization, clear service boundaries, <5 core dependencies per service
3. **Test-First Development**: Red-Green-Refactor, >80% coverage, contract tests
4. **API-First Design**: tRPC contracts defined before implementation, versioned endpoints
5. **Observability & Quality**: Structured JSON logging, health checks, performance metrics
6. **Continuous Learning**: Document decisions, improve patterns, share knowledge

When making changes, ensure compliance with these principles.

## Feature Specifications

Detailed user stories and requirements: `specs/001-event-lifecycle-management/spec.md`

**Priority Order**:
- **P1**: Event Management (create, track status, view history)
- **P2**: Task Management (assign, complete, track dependencies)
- **P3**: Resource Scheduling (assign, detect conflicts, view utilization)
- **P4**: Analytics & Reporting (completion rates, resource utilization)
- **P5**: Client Communication (record communications, schedule follow-ups)

## Next Steps

After Phase 2 completion, continue Phase 3 (Event Management):
1. Complete remaining event router procedures (subscription implementation)
2. Build event management UI components (list, detail, create form)
3. Implement event timeline visualization
4. Add client management router and UI

See `specs/001-event-lifecycle-management/tasks.md` for current task status.

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output CLAUDE.md|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-cache-components.mdx,07-fetching-data.mdx,08-updating-data.mdx,09-caching-and-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,prefetching.mdx,production-checklist.mdx,progressive-web-apps.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route-segment-config.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,browserDebugInfoInTerminal.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,isolatedDevBuild.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-report-web-vitals.mdx,use-router.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,isolatedDevBuild.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
