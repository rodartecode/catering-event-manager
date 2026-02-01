# Tasks: Complete Phase 8 Production Readiness

## Phase 1: Error Handling UI

- [x] T01 Create global error boundary at `apps/web/src/app/error.tsx`
  - Use 'use client' directive
  - Display user-friendly error message
  - Include "Try Again" button that calls reset()
  - Include "Return Home" link
  - Log error to console for debugging

- [x] T02 Create 404 page at `apps/web/src/app/not-found.tsx`
  - Display "Page Not Found" message
  - Include link back to dashboard
  - Maintain app styling consistency

## Phase 2: Production Dockerfiles

- [x] T03 [P] Create Next.js production Dockerfile at `apps/web/Dockerfile`
  - Multi-stage build (deps, builder, runner)
  - Use node:20-alpine base image
  - Copy only necessary production files
  - Set NODE_ENV=production
  - Expose port 3000
  - Use standalone output mode

- [x] T04 [P] Create Go service production Dockerfile at `apps/scheduling-service/Dockerfile`
  - Multi-stage build (builder, runner)
  - Use golang:1.23-alpine for build
  - Use alpine:latest for runtime
  - CGO_ENABLED=0 for static binary
  - Expose port 8080
  - Non-root user for security

- [x] T05 Create production Docker Compose at `docker-compose.prod.yml`
  - PostgreSQL 17 with persistent volume
  - Next.js app building from Dockerfile
  - Go scheduler building from Dockerfile
  - Production environment variables
  - Health checks for all services
  - Restart policies

## Phase 3: Database & Scripts

- [x] T06 Create database seed script at `packages/database/src/seed.ts`
  - Create admin user (admin@example.com)
  - Create sample clients (3-5)
  - Create sample events in various statuses
  - Create sample tasks with assignments
  - Create sample resources (staff, equipment)
  - Include CLI execution support

- [x] T07 Add seed script to package.json
  - Add `db:seed` script in packages/database
  - Add `db:seed` script in root package.json

- [x] T08 Create health check script at `scripts/health-check.sh`
  - Check PostgreSQL connectivity
  - Check Next.js health endpoint
  - Check Go scheduler health endpoint
  - Exit codes for CI/CD integration

## Phase 4: Security Headers

- [x] T09 Add security headers to `apps/web/next.config.ts`
  - Content-Security-Policy (default-src, script-src, style-src)
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy (restrict features)

## Phase 5: Documentation

- [x] T10 Create CONTRIBUTING.md at repository root
  - Development environment setup
  - Branch naming: feature/, fix/, docs/
  - Commit format: conventional commits
  - PR template reference
  - Code review process
  - Testing requirements
  - Links to architecture docs

## Phase 6: Verification

- [x] T11 Verify Docker builds locally
  - `docker build -t catering-web apps/web`
  - `docker build -t catering-scheduler apps/scheduling-service`

- [x] T12 Verify docker-compose.prod.yml starts all services
  - `docker-compose -f docker-compose.prod.yml up`
  - Verify health checks pass

- [x] T13 Verify seed script populates database
  - `pnpm db:seed`
  - Verify data in Drizzle Studio

- [x] T14 Verify error pages render correctly
  - Navigate to /nonexistent-page (404)
  - Trigger an error in a component (error boundary)

---

## Parallelization Notes

- **T03 and T04** can run in parallel (independent Dockerfiles)
- **T01 and T02** can run in parallel (independent pages)
- **T09 and T10** can run in parallel (independent files)
- Verification phase (T11-T14) runs after all implementation

## Estimated Effort

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| Error Handling | 2 | 30 mins |
| Dockerfiles | 3 | 1-2 hours |
| Database & Scripts | 3 | 1 hour |
| Security Headers | 1 | 15 mins |
| Documentation | 1 | 30 mins |
| Verification | 4 | 30 mins |
| **Total** | **14** | **4-5 hours** |
