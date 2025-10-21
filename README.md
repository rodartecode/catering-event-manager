# Catering Event Manager

Event lifecycle management system for catering companies - from initial inquiry to post-event follow-up.

## Architecture

**Hybrid Microservices Monorepo**:
- **Next.js 15 Web Application** (`apps/web/`): Main UI, tRPC API, authentication, CRUD operations
- **Go Scheduling Service** (`apps/scheduling-service/`): High-performance resource conflict detection
- **Shared Packages** (`packages/`): Database schemas (Drizzle), TypeScript types, configurations

**Tech Stack**:
- Frontend: Next.js 15 + React 19 + Tailwind CSS
- API: tRPC v11 (type-safe RPC)
- Database: PostgreSQL 17 + Drizzle ORM
- Scheduling: Go 1.23 + Fiber v3 + SQLC
- Monorepo: pnpm + Turborepo

## Quick Start

### Prerequisites

- Node.js 20 LTS
- pnpm 10+
- Go 1.23+
- Docker Desktop
- PostgreSQL 17 (or use Docker)

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Environment configuration**:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env.local
   cp apps/scheduling-service/.env.example apps/scheduling-service/.env

   # Edit .env files with your database credentials
   ```

3. **Start PostgreSQL** (Docker):
   ```bash
   docker-compose up -d postgres
   ```

4. **Run database migrations**:
   ```bash
   cd packages/database
   pnpm db:push
   cd ../..
   ```

5. **Start all services**:
   ```bash
   # Option 1: Docker Compose (all services)
   docker-compose up

   # Option 2: Manual (separate terminals)
   pnpm dev           # Terminal 1: Next.js app
   cd apps/scheduling-service && go run cmd/scheduler/main.go  # Terminal 2: Go service
   ```

6. **Access the application**:
   - Web UI: http://localhost:3000
   - Scheduling API: http://localhost:8080/api/v1/health

## Project Structure

```
catering-event-manager/
├── apps/
│   ├── web/                    # Next.js 15 application
│   └── scheduling-service/     # Go Fiber service
├── packages/
│   ├── database/              # Drizzle ORM schemas
│   ├── types/                 # Shared TypeScript types
│   └── config/                # Shared configs
├── specs/                     # Feature specifications
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Development

```bash
# Development servers
pnpm dev

# Build all packages
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm lint

# Code formatting
pnpm format

# Database operations
pnpm db:generate   # Generate migrations
pnpm db:migrate    # Apply migrations
pnpm db:studio     # Open Drizzle Studio
```

## Features

See [specs/001-event-lifecycle-management/](specs/001-event-lifecycle-management/) for complete feature documentation:

- **Event Management** (P1): Create events, track status through lifecycle, real-time updates
- **Task Management** (P2): Assign tasks, track completion, manage dependencies
- **Resource Scheduling** (P3): Allocate staff/equipment, detect conflicts automatically
- **Analytics & Reporting** (P4): Event completion rates, resource utilization
- **Client Communication** (P5): Record communications, schedule follow-ups

## Implementation Status

Phase 1: ✅ Setup Complete
- Monorepo structure initialized
- Dependencies configured
- Docker Compose ready

See [tasks.md](specs/001-event-lifecycle-management/tasks.md) for detailed implementation plan.

## License

Private - All Rights Reserved
