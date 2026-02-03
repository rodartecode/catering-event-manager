# CLAUDE.md - Scheduling Service

Go Fiber v3 microservice for resource conflict detection (<100ms target).

→ **Commands**: See `/COMMANDS.md` for Go commands
→ **Environment**: See `/ENV.md` for required variables
→ **Troubleshooting**: See `/TROUBLESHOOTING.md` for common issues
→ **Architecture**: See `/ARCHITECTURE.md` for system design

## Service Overview

**Performance Target**: Resource conflict detection in <100ms
**Architecture**: Clean domain-driven design with repository pattern
**Database**: Shared PostgreSQL schema via SQLC code generation

## Package Structure

```
internal/
├── domain/          # Core business logic (no dependencies)
│   ├── resource.go     # Resource, Conflict entities
│   └── errors.go       # Domain error types
├── scheduler/       # Business algorithms
│   ├── conflict.go     # ConflictService
│   └── availability.go # AvailabilityService
├── api/            # HTTP layer (Fiber v3)
│   ├── handlers.go     # REST endpoints
│   └── middleware.go   # CORS, logging, auth
├── repository/     # Data access (SQLC generated)
│   └── queries.sql     # Hand-written SQL
└── config/         # Environment configuration
```

## API Endpoints

**Base URL**: `http://localhost:8080/api/v1`

### POST `/scheduling/check-conflicts`
```json
{
  "resource_ids": [1, 2, 3],
  "start_time": "2024-03-15T10:00:00Z",
  "end_time": "2024-03-15T14:00:00Z"
}
```

### GET `/resource-availability?resource_id=1&start_date=...&end_date=...`

### GET `/health`

## Core Algorithm

Conflict detection uses GiST indexes for O(log n) time range overlap:

```sql
SELECT r.id, r.name, rs.start_time, rs.end_time
FROM resource_schedule rs
JOIN resources r ON r.id = rs.resource_id
WHERE rs.resource_id = ANY($1::int[])
  AND tsrange(rs.start_time, rs.end_time) && tsrange($2, $3);
```

## SQLC Integration

After schema changes in `packages/database`:

```bash
cd apps/scheduling-service
sqlc generate  # Regenerate Go types
go test ./internal/repository/...  # Verify
```

**Configuration** (`sqlc.yaml`):
```yaml
sql:
  - engine: "postgresql"
    queries: "./internal/repository/queries.sql"
    schema: "../../packages/database/src/migrations"
```

## Testing

### Unit Tests (Algorithms)
```bash
go test -v ./internal/scheduler/...
go test -bench=BenchmarkConflictDetection ./internal/scheduler/
```

### Integration Tests (TestContainers)
```bash
go test -v ./internal/api/...
go test -tags integration ./...
```

## Performance Optimization

### Database Indexes
```sql
-- GiST index for time range overlap
CREATE INDEX idx_resources_time_range ON resource_schedule
USING GIST (tsrange(start_time, end_time));
```

### Query Patterns
```go
// GOOD: Batch multiple resources in single query
params := repository.CheckConflictsParams{
    Column1: []int32{1, 2, 3},  // Multiple resources
}

// AVOID: N+1 queries per resource
```

### Benchmarking
```bash
go test -bench=. -benchmem ./internal/scheduler/
go tool pprof cpu.prof  # Profile analysis
```

## Cross-Service Integration

**Next.js → Scheduling Service**:
```typescript
const response = await fetch(`${SCHEDULING_SERVICE_URL}/api/v1/scheduling/check-conflicts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ resource_ids: [1, 2], start_time: '...', end_time: '...' })
});
```

## Related Documentation

- **Project Root**: `../../CLAUDE.md`
- **Database Schema**: `../../packages/database/CLAUDE.md`
- **Next.js App**: `../../apps/web/CLAUDE.md`
