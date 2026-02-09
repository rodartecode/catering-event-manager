# Development Commands Reference

Universal command reference for the Catering Event Manager monorepo.

## Quick Start

```bash
pnpm install                    # Install all dependencies
docker-compose up -d postgres   # Start PostgreSQL
cd packages/database && pnpm db:push && cd ../..  # Initialize schema
pnpm dev                        # Start all services
```

## Development

| Command | Description | Location |
|---------|-------------|----------|
| `pnpm dev` | Start all services (Turborepo) | Root |
| `pnpm dev` | Next.js app on :3000 | apps/web |
| `go run cmd/scheduler/main.go` | Go service on :8080 | apps/scheduling-service |
| `docker-compose up` | All services with PostgreSQL | Root |

## Database

All database commands run from `packages/database/`:

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm db:generate` | Generate Drizzle migrations | After schema changes |
| `pnpm db:push` | Push schema directly to DB | Dev only (no migration files) |
| `pnpm db:migrate` | Apply pending migrations | Production deployments |
| `pnpm db:studio` | Launch Drizzle Studio on :4983 | Visual DB exploration |
| `pnpm db:seed` | Populate development data | After fresh db:push |

**After schema changes** - regenerate types for both services:
```bash
cd packages/database && pnpm db:generate
cd ../../apps/scheduling-service && sqlc generate
pnpm type-check
```

## Code Quality

| Command | Description |
|---------|-------------|
| `pnpm lint` | ESLint + Biome linting |
| `pnpm type-check` | TypeScript type checking |
| `pnpm format` | Format code with Biome |
| `pnpm format:check` | Check formatting without writing |

## Testing

### TypeScript (Vitest)
```bash
pnpm test                    # All tests
pnpm test:watch              # Watch mode
pnpm test:coverage           # With coverage report
pnpm test:ui                 # Vitest UI on :51204
```

### Go
```bash
go test ./...                          # All tests
go test -v ./internal/scheduler/...    # Verbose output
go test -cover ./...                   # With coverage
go test -bench=. ./internal/scheduler/ # Benchmarks
```

### E2E (Playwright)
```bash
pnpm test:e2e          # Full E2E suite
pnpm test:e2e:ui       # Playwright UI
```

### Quality Gates
```bash
pnpm test:quality         # Visual/a11y/performance
pnpm test:quality:update  # Update visual baselines
```

### Integration
```bash
pnpm test:integration    # Cross-service tests (requires Go 1.25+)
```

## Building

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all apps and packages |
| `pnpm clean` | Remove build artifacts |
| `go build -o bin/scheduler cmd/scheduler/main.go` | Build Go service |

## Go Service (apps/scheduling-service)

```bash
go run cmd/scheduler/main.go    # Development server
air                             # Hot reload (if installed)
sqlc generate                   # Regenerate types from SQL
```

## Docker

```bash
docker-compose up              # All services
docker-compose up -d postgres  # Just PostgreSQL
docker-compose ps postgres     # Check status
docker-compose logs postgres   # View logs
docker-compose restart postgres # Restart
```

## Direct Database Access

```bash
psql postgresql://admin:changeme@localhost:5432/catering_events
psql $DATABASE_URL -c "\dt"    # List tables
psql $DATABASE_URL -c "\d events"  # Describe table
```
