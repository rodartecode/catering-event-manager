# Troubleshooting Guide

Common issues and solutions for the Catering Event Manager.

## PostgreSQL Connection Issues

```bash
# Check if running
docker-compose ps postgres
docker-compose logs postgres

# Restart
docker-compose restart postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
psql $DATABASE_URL -c "\dt"  # List tables
```

## Port Conflicts

```bash
# Check what's using ports
lsof -i :3000   # Next.js
lsof -i :8080   # Go service
lsof -i :5432   # PostgreSQL

# Kill conflicting process
kill -9 <PID>
```

## Dependency Issues

```bash
# Clean reinstall (TypeScript)
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
pnpm store prune  # Clear pnpm cache

# Clean reinstall (Go)
cd apps/scheduling-service
go mod tidy
go clean -cache
```

## Type Errors After Schema Changes

Both services share the database schema. After changes:

```bash
# 1. Generate Drizzle migrations
cd packages/database && pnpm db:generate

# 2. Regenerate Go types
cd ../../apps/scheduling-service && sqlc generate

# 3. Verify TypeScript types
pnpm type-check
```

## tRPC Client Type Mismatches

```bash
# Restart dev server to pick up router type changes
pnpm dev
```

## Test Database Issues

```bash
# Check Docker containers
docker ps | grep postgres
docker-compose restart postgres

# Reset database (dev only)
docker-compose down postgres
docker volume rm catering-event-manager_postgres_data
docker-compose up -d postgres
cd packages/database && pnpm db:push && pnpm db:seed
```

## Visual Regression Test Failures

```bash
# Update baselines after intentional UI changes
pnpm test:quality:update
git add test/e2e/quality-gates/*.png
```

## Go Service Integration Test Failures

```bash
# Ensure Go toolchain available
go version  # Requires Go 1.24+

# Test build
cd apps/scheduling-service
go build -o bin/test-scheduler cmd/scheduler/main.go
```

## SQLC Generation Errors

```bash
# Verify schema compatibility
cd apps/scheduling-service
sqlc generate  # Should not produce errors

# If errors, check that migrations in packages/database/src/migrations are valid
```

## Performance Issues

### Slow Queries
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM events WHERE status = 'planning';

-- Verify indexes exist
\di events
```

### Connection Pool Exhaustion
```bash
# Monitor active connections
psql $DATABASE_URL -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
```

## Debug Modes

```bash
# Playwright debugging
pnpm test:e2e:ui

# Vitest debugging
pnpm test:ui

# tRPC debugging
TRPC_DEBUG=1 pnpm dev

# Database query debugging
DATABASE_DEBUG=1 pnpm dev

# Next.js bundle analysis
ANALYZE=true pnpm build
```

## Migration Problems

```bash
# Check migration status
pnpm db:studio

# Manual rollback (if needed)
psql $DATABASE_URL -c "DELETE FROM __drizzle_migrations WHERE id = 'XXXX';"

# Reset and re-apply (dev only)
docker-compose down postgres
docker volume rm catering-event-manager_postgres_data
docker-compose up -d postgres
cd packages/database && pnpm db:push
```

## Session Reference

For accumulated debugging patterns and solutions, see `docs/learnings.md`.
