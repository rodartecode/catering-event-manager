# Quickstart Guide: Catering Event Lifecycle Management

**Feature**: 001-event-lifecycle-management
**Date**: 2025-10-19
**Estimated Setup Time**: 30-45 minutes

## Overview

This guide helps you set up the local development environment for the hybrid Next.js + Go microservices architecture. By the end, you'll have:

- PostgreSQL 17 database running locally
- Next.js 16 web application with tRPC + Drizzle
- Go Fiber scheduling service with SQLC
- All services communicating via Docker Compose

---

## Prerequisites

### Required Software

Install these before proceeding:

1. **Node.js 20 LTS**: https://nodejs.org/
   ```bash
   node --version  # Should be v20.x.x
   ```

2. **pnpm 10+**: https://pnpm.io/installation
   ```bash
   npm install -g pnpm
   pnpm --version  # Should be 10.x.x
   ```

3. **Go 1.25+**: https://go.dev/dl/
   ```bash
   go version  # Should be go1.24.x
   ```

4. **Docker Desktop**: https://www.docker.com/products/docker-desktop
   ```bash
   docker --version  # Should be 20.x.x or higher
   docker-compose --version
   ```

5. **PostgreSQL 17** (optional, for local DB without Docker):
   ```bash
   psql --version  # Should be 17.x
   ```

### System Requirements

- **OS**: macOS, Linux, or WSL2 on Windows
- **RAM**: 8GB minimum (16GB recommended)
- **Disk Space**: 5GB free

---

## Project Setup

### 1. Clone Repository and Install Dependencies

```bash
# Navigate to project root
cd /home/jerod/code/catering-event-manager

# Install all dependencies (Next.js app + packages)
pnpm install

# Install Go dependencies for scheduling service
cd apps/scheduling-service
go mod download
cd ../..
```

**Expected Output**:
```
Progress: resolved 1234 packages, reused 1200 from cache
Done in 15.2s
```

---

### 2. Environment Configuration

Create environment files from templates:

```bash
# Root environment file
cp .env.example .env

# Next.js app environment
cp apps/web/.env.example apps/web/.env.local

# Go service environment
cp apps/scheduling-service/.env.example apps/scheduling-service/.env
```

**Edit `.env`** (root):
```bash
# Database
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"

# Next-Auth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Scheduling Service
SCHEDULING_SERVICE_URL="http://localhost:8080"
```

**Edit `apps/web/.env.local`**:
```bash
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
SCHEDULING_SERVICE_URL="http://localhost:8080"
```

**Edit `apps/scheduling-service/.env`**:
```bash
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
PORT=8080
```

---

### 3. Database Setup

#### Option A: Docker Compose (Recommended)

Start PostgreSQL in Docker:

```bash
# Start only PostgreSQL
docker-compose up -d postgres

# Wait for PostgreSQL to be ready (10-15 seconds)
docker-compose logs -f postgres
# Look for: "database system is ready to accept connections"
```

#### Option B: Local PostgreSQL

If you have PostgreSQL 17 installed locally:

```bash
# Create database
createdb catering_events

# Create user (if needed)
psql -c "CREATE USER admin WITH PASSWORD 'changeme';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE catering_events TO admin;"
```

---

### 4. Run Database Migrations

Generate and apply Drizzle migrations:

```bash
# Navigate to database package
cd packages/database

# Generate migrations from schema
pnpm db:generate

# Push schema to database
pnpm db:push

# Or apply migrations manually
pnpm db:migrate

cd ../..
```

**Verify database setup**:
```bash
psql postgresql://admin:changeme@localhost:5432/catering_events -c "\dt"
```

**Expected Output**:
```
             List of relations
 Schema |        Name         | Type  | Owner
--------+---------------------+-------+-------
 public | users               | table | admin
 public | clients             | table | admin
 public | events              | table | admin
 public | event_status_log    | table | admin
 public | tasks               | table | admin
 public | resources           | table | admin
 public | task_resources      | table | admin
 public | resource_schedule   | table | admin
 public | communications      | table | admin
(9 rows)
```

---

### 5. Seed Database (Optional)

Create test data for development:

```bash
cd packages/database
pnpm db:seed
cd ../..
```

**Seeds**:
- 2 admin users, 3 manager users
- 10 clients
- 20 events (various statuses)
- 50 tasks
- 15 resources (staff, equipment, materials)

---

### 6. Start Development Servers

#### Option A: Docker Compose (All Services)

```bash
# Start all services (PostgreSQL + Next.js + Go)
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f
```

**Services**:
- **PostgreSQL**: http://localhost:5432
- **Next.js Web**: http://localhost:3000
- **Go Scheduler**: http://localhost:8080

#### Option B: Manual (Separate Terminals)

**Terminal 1 - Next.js App**:
```bash
cd apps/web
pnpm dev
```

**Terminal 2 - Go Scheduler**:
```bash
cd apps/scheduling-service
go run cmd/scheduler/main.go
```

**Note**: tRPC types are generated automatically during development.

---

### 7. Verify Setup

#### Check Health Endpoints

```bash
# Next.js app
curl http://localhost:3000/api/health

# Go scheduling service
curl http://localhost:8080/api/v1/health
```

**Expected Responses**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-10-19T12:34:56Z"
}
```

#### Access Web Application

1. Open browser: http://localhost:3000
2. Click "Login" (or navigate to `/login`)
3. Use seeded credentials:
   - **Admin**: `admin@example.com` / `password123`
   - **Manager**: `manager@example.com` / `password123`

4. You should see the dashboard with:
   - Event list
   - Task overview
   - Resource schedule
   - Analytics (if events exist)

---

## Development Workflow

### Running Tests

```bash
# Run all tests (Vitest + Go tests)
pnpm test

# Run only Next.js tests
cd apps/web && pnpm test && cd ../..

# Run only Go tests
cd apps/scheduling-service && go test ./... && cd ../..

# Run E2E tests (Playwright)
cd apps/web && pnpm test:e2e && cd ../..

# Watch mode (Vitest)
cd apps/web && pnpm test:watch && cd ../..
```

### Database Management

```bash
# Generate new migration (after schema changes)
cd packages/database
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Reset database (drop schema and re-push)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
cd packages/database && pnpm db:push && pnpm db:seed && cd ../..

# Open database GUI (Drizzle Studio)
pnpm db:studio
```

### Code Generation

```bash
# Generate SQLC code (Go service)
cd apps/scheduling-service
sqlc generate
cd ../..
```

### Linting & Formatting

```bash
# Lint all packages
pnpm lint

# Format code (Biome)
pnpm format

# Check formatting without writing
pnpm format:check

# Type check TypeScript
pnpm type-check
```

---

## Turborepo Commands

Turborepo orchestrates tasks across all packages:

```bash
# Build all packages
pnpm build

# Build only web app
pnpm build --filter=web

# Run dev servers in parallel
pnpm dev

# Clean all build artifacts
pnpm clean
```

---

## Troubleshooting

### Issue: Database Connection Error

**Error**: `error: connection refused`

**Solution**:
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check DATABASE_URL in .env files
```

---

### Issue: pnpm install fails

**Error**: `EACCES: permission denied`

**Solution**:
```bash
# Clear pnpm cache
pnpm store prune

# Re-install with proper permissions
pnpm install --shamefully-hoist
```

---

### Issue: Port already in use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in apps/web/.env.local
PORT=3001
```

---

### Issue: Go build fails

**Error**: `go: cannot find module`

**Solution**:
```bash
cd apps/scheduling-service

# Clean module cache
go clean -modcache

# Re-download dependencies
go mod download
go mod tidy
```

---

### Issue: Migrations fail

**Error**: `Error: relation "users" already exists`

**Solution**:
```bash
# Reset database completely
cd packages/database
pnpm db:reset

# Or manually drop schema
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm db:migrate
```

---

## Next Steps

After successful setup:

1. **Read Documentation**:
   - `specs/001-event-lifecycle-management/plan.md` (implementation plan)
   - `specs/001-event-lifecycle-management/data-model.md` (database schema)
   - `specs/001-event-lifecycle-management/contracts/` (API contracts)

2. **Implement Feature**:
   - Run `/speckit.tasks` to generate implementation tasks
   - Follow test-first development workflow
   - Use `specs/001-event-lifecycle-management/tasks.md` for guidance

3. **Explore Architecture**:
   - Browse `apps/web/src/server/routers/` (tRPC procedures)
   - Browse `apps/scheduling-service/internal/` (Go service structure)
   - Check `packages/database/src/schema/` (Drizzle schemas)

---

## Useful Commands Cheat Sheet

```bash
# Start everything
docker-compose up

# Stop everything
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Rebuild containers
docker-compose up --build

# Database migrations
cd packages/database && pnpm db:migrate

# Run tests
pnpm test

# Format code
pnpm format

# Type check
pnpm type-check

# Build for production
pnpm build

# Clean all
pnpm clean
```

---

## Support

For issues or questions:
1. Check `specs/001-event-lifecycle-management/plan.md` for architecture details
2. Review constitution at `.specify/memory/constitution.md` for principles
3. Create GitHub issue with reproduction steps

---

**Setup Complete!** 🎉

You're now ready to start implementing the catering event lifecycle management system. Happy coding!
