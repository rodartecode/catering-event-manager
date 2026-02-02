# CLAUDE.md - Scheduling Service

Performance-critical Go microservice for resource conflict detection and scheduling algorithms in the catering event management system.

## Service Overview

**Go Fiber v3 HTTP service** optimized for sub-100ms conflict detection with PostgreSQL 17 and SQLC type-safe queries.

**Performance Target**: Resource conflict detection in <100ms (SC-003 requirement)
**Architecture**: Clean domain-driven design with repository pattern
**Database**: Shared PostgreSQL schema with Next.js app via SQLC code generation

## Essential Commands

### Development

```bash
# Start service (from scheduling-service directory)
go run cmd/scheduler/main.go             # Development server on :8080
go build -o bin/scheduler cmd/scheduler/main.go && ./bin/scheduler  # Build and run

# With hot reload (install air: go install github.com/air-verse/air@latest)
air                                      # Auto-restart on file changes

# Environment setup
cp .env.example .env                     # Copy environment template
# Edit DATABASE_URL and other settings
```

### Database Operations

```bash
# Generate type-safe Go code from SQL queries (after schema changes)
sqlc generate                           # Reads sqlc.yaml, generates repository/*.go

# Verify database connection
go run cmd/scheduler/main.go &          # Start service
curl http://localhost:8080/api/v1/health  # Check health endpoint
```

### Testing

```bash
# Unit tests
go test ./...                           # All packages
go test -v ./internal/scheduler/...     # Verbose output for scheduler package
go test -run TestConflictDetection      # Specific test

# Integration tests (requires Docker for TestContainers)
go test -v ./internal/api/...           # API layer with real database
go test -tags integration ./...         # All integration tests

# Benchmarks (performance validation)
go test -bench=BenchmarkConflictDetection ./internal/scheduler/
go test -bench=. -benchmem ./internal/scheduler/  # Include memory stats

# Coverage
go test -cover ./...                    # Basic coverage
go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out
```

### Building

```bash
# Local build
go build -o bin/scheduler cmd/scheduler/main.go

# Docker build (from repo root)
docker build -f apps/scheduling-service/Dockerfile -t catering-scheduler .

# Cross-platform builds
GOOS=linux GOARCH=amd64 go build -o bin/scheduler-linux cmd/scheduler/main.go
```

## Architecture & Package Structure

### Clean Architecture Layers

```
internal/
├── domain/          # Core business logic (no dependencies)
│   ├── resource.go     # Resource, ScheduleEntry, TimeRange entities
│   ├── conflict.go     # Conflict detection domain models
│   └── errors.go       # Domain-specific error types
├── scheduler/       # Use cases and business algorithms
│   ├── conflict.go     # ConflictService (main scheduling logic)
│   ├── availability.go # AvailabilityService (resource calendar)
│   └── *_test.go       # Algorithm unit tests + benchmarks
├── api/            # HTTP transport layer (Fiber v3)
│   ├── handlers.go     # REST endpoints (/check-conflicts, /resource-availability)
│   ├── middleware.go   # CORS, logging, auth middleware
│   └── *_test.go       # HTTP handler tests
├── repository/     # Data access layer (SQLC generated)
│   ├── queries.sql     # Hand-written SQL queries
│   ├── queries.sql.go  # SQLC generated type-safe Go code
│   ├── models.go       # SQLC generated struct types
│   └── connection.go   # Database connection management
├── logger/         # Structured logging (zerolog)
├── config/         # Environment configuration
└── testutil/       # Test utilities (TestContainers, fixtures)
```

### Domain Models

**Key entities** (`internal/domain/`):
```go
type Resource struct {
    ID          int32        `json:"id"`
    Name        string       `json:"name"`
    Type        ResourceType `json:"type"`  // "staff", "equipment", "materials"
    IsAvailable bool         `json:"is_available"`
    HourlyRate  *string      `json:"hourly_rate,omitempty"`
}

type Conflict struct {
    ResourceID           int32     `json:"resource_id"`
    ResourceName         string    `json:"resource_name"`
    ConflictingEventID   int32     `json:"conflicting_event_id"`
    RequestedStartTime   time.Time `json:"requested_start_time"`
    RequestedEndTime     time.Time `json:"requested_end_time"`
    ExistingStartTime    time.Time `json:"existing_start_time"`
    ExistingEndTime      time.Time `json:"existing_end_time"`
    Message              string    `json:"message"`
}
```

**Domain errors** pattern for clean error handling:
```go
type DomainError struct {
    Code    ErrorCode `json:"code"`
    Message string    `json:"message"`
    Cause   error     `json:"-"`
}

const (
    ErrCodeValidation = "validation_error"
    ErrCodeNotFound   = "not_found"
    ErrCodeInternal   = "internal_error"
)
```

## Core Algorithms

### Conflict Detection (`internal/scheduler/conflict.go`)

**Algorithm**: Time range overlap detection using PostgreSQL tsrange and GiST indexes

```go
func (s *ConflictService) CheckConflicts(ctx context.Context, req CheckConflictsRequest) (*CheckConflictsResponse, error) {
    // 1. Validate time range (end > start)
    // 2. Execute optimized SQL query with resource_id IN clause
    // 3. Convert database rows to domain Conflict objects
    // 4. Return structured response with conflict details
}
```

**SQL Query** (hand-optimized for <100ms performance):
```sql
-- Uses GiST index: idx_resources_time_range ON resource_assignments USING GIST (tsrange(start_time, end_time))
SELECT r.id, r.name, rs.event_id, e.event_name, rs.start_time, rs.end_time
FROM resource_schedule rs
JOIN resources r ON r.id = rs.resource_id
JOIN events e ON e.id = rs.event_id
WHERE rs.resource_id = ANY($1::int[])
  AND tsrange(rs.start_time, rs.end_time) && tsrange($2, $3)
  AND ($4::int IS NULL OR rs.id != $4);  -- Exclude specific schedule_id for updates
```

### Resource Availability (`internal/scheduler/availability.go`)

**Algorithm**: Generate resource schedule view for date range visualization

```go
func (s *AvailabilityService) GetResourceAvailability(ctx context.Context, req ResourceAvailabilityRequest) (*ResourceAvailabilityResponse, error) {
    // 1. Validate resource exists
    // 2. Fetch all schedule entries for date range
    // 3. Include event/task context for each assignment
    // 4. Return chronological schedule entries
}
```

## SQLC Integration

### Code Generation Workflow

**Schema sync** with Next.js app:
```yaml
# sqlc.yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "./internal/repository/queries.sql"
    schema: "../../packages/database/src/migrations"  # Shared with Drizzle ORM
    gen:
      go:
        package: "repository"
        out: "./internal/repository"
        emit_json_tags: true        # Generate JSON tags
        emit_interface: true        # Generate Querier interface
```

**After database schema changes**:
```bash
cd packages/database
pnpm db:generate                   # Generate Drizzle migration files
cd ../../apps/scheduling-service
sqlc generate                      # Regenerate Go types and queries
go test ./internal/repository/...  # Verify type safety
```

### Query Patterns

**Hand-written SQL** (`internal/repository/queries.sql`):
```sql
-- name: CheckConflicts :many
-- Detect scheduling conflicts for multiple resources
SELECT
    rs.resource_id,
    r.name as resource_name,
    rs.event_id,
    e.event_name,
    rs.task_id,
    t.title as task_title,
    rs.start_time as existing_start_time,
    rs.end_time as existing_end_time
FROM resource_schedule rs
JOIN resources r ON r.id = rs.resource_id
JOIN events e ON e.id = rs.event_id
LEFT JOIN tasks t ON t.id = rs.task_id
WHERE rs.resource_id = ANY(sqlc.arg(resource_ids)::int[])
  AND tsrange(rs.start_time, rs.end_time) && tsrange(sqlc.arg(start_time), sqlc.arg(end_time))
  AND (sqlc.narg(exclude_schedule_id) IS NULL OR rs.id != sqlc.narg(exclude_schedule_id));
```

**Generated Go code** (`internal/repository/queries.sql.go`):
```go
type CheckConflictsParams struct {
    Column1             []int32   `json:"column1"`        // resource_ids
    Column2             time.Time `json:"column2"`        // start_time
    Column3             time.Time `json:"column3"`        // end_time
    ExcludeScheduleID   sql.NullInt32 `json:"exclude_schedule_id"`
}

func (q *Queries) CheckConflicts(ctx context.Context, arg CheckConflictsParams) ([]CheckConflictsRow, error) {
    // Generated type-safe implementation
}
```

## API Layer (Fiber v3)

### REST Endpoints

**Base URL**: `http://localhost:8080/api/v1`

#### POST `/scheduling/check-conflicts`
```json
// Request
{
  "resource_ids": [1, 2, 3],
  "start_time": "2024-03-15T10:00:00Z",
  "end_time": "2024-03-15T14:00:00Z",
  "exclude_schedule_id": 42  // Optional: exclude this assignment (for updates)
}

// Response
{
  "has_conflicts": true,
  "conflicts": [
    {
      "resource_id": 1,
      "resource_name": "Chef John",
      "conflicting_event_id": 15,
      "conflicting_event_name": "Wedding Reception",
      "existing_start_time": "2024-03-15T09:00:00Z",
      "existing_end_time": "2024-03-15T13:00:00Z",
      "requested_start_time": "2024-03-15T10:00:00Z",
      "requested_end_time": "2024-03-15T14:00:00Z",
      "message": "Resource 'Chef John' is already assigned to event 'Wedding Reception' from 2024-03-15 09:00 to 2024-03-15 13:00"
    }
  ]
}
```

#### GET `/resource-availability?resource_id=1&start_date=2024-03-15T00:00:00Z&end_date=2024-03-16T00:00:00Z`
```json
// Response
{
  "resource_id": 1,
  "resource_name": "Chef John",
  "entries": [
    {
      "id": 101,
      "event_id": 15,
      "event_name": "Wedding Reception",
      "task_id": 45,
      "task_title": "Food Preparation",
      "start_time": "2024-03-15T09:00:00Z",
      "end_time": "2024-03-15T13:00:00Z",
      "notes": "Prepare appetizers and main course"
    }
  ]
}
```

#### GET `/health`
```json
{
  "status": "ok",
  "database": "connected"
}
```

### Middleware Stack

**Request flow** (`internal/api/middleware.go`):
1. **CORS**: Allow requests from Next.js app (`localhost:3000`)
2. **Request Logging**: Structured logs with request ID, duration, status
3. **Error Recovery**: Catch panics, return 500 with error ID
4. **Rate Limiting**: Protect against excessive conflict check requests

```go
func RegisterMiddleware(app *fiber.App) {
    app.Use(cors.New(cors.Config{
        AllowOrigins: "http://localhost:3000,https://catering-app.com",
        AllowMethods: "GET,POST,PUT,DELETE",
        AllowHeaders: "Content-Type,Authorization",
    }))

    app.Use(requestLogger())  // Structured logging middleware
    app.Use(recover.New())    // Panic recovery
}
```

## Testing Strategy

### Unit Tests (Algorithm Validation)

**Conflict detection tests** (`internal/scheduler/conflict_test.go`):
```go
func TestConflictDetection(t *testing.T) {
    // Test cases:
    // - No conflicts (different resources, non-overlapping times)
    // - Direct overlap (same resource, same time)
    // - Partial overlap (same resource, partial time overlap)
    // - Adjacent times (same resource, end_time1 == start_time2) - should NOT conflict
    // - Multiple resources with mixed conflicts
    // - Exclude schedule ID functionality (for updates)
}

func BenchmarkConflictDetection(b *testing.B) {
    // Performance benchmarks:
    // - 10 resources, 100 existing assignments
    // - Target: <100ms for 95th percentile
}
```

### Integration Tests (TestContainers)

**Database integration** (`internal/api/handlers_test.go`):
```go
func TestCheckConflictsEndpoint(t *testing.T) {
    // 1. Start PostgreSQL TestContainer
    testDB := testutil.SetupTestDB(t)
    defer testutil.TeardownTestDB(t, testDB)

    // 2. Seed test data (resources, events, assignments)
    testutil.SeedTestData(t, testDB.DB)

    // 3. Start Fiber app with test database
    app := setupTestApp(testDB.DB)

    // 4. Test HTTP endpoints with real database
    req := httptest.NewRequest("POST", "/api/v1/scheduling/check-conflicts", body)
    resp, _ := app.Test(req)

    // 5. Verify response format and business logic
    assert.Equal(t, 200, resp.StatusCode)
}
```

**TestContainers setup** (`internal/testutil/container.go`):
- PostgreSQL 17 Alpine container
- Schema initialization with CREATE TABLE statements
- Test data factories for resources, events, assignments
- Automatic cleanup after test completion

### Test Data Factories

**Fixture generation** (`internal/testutil/fixtures.go`):
```go
func CreateTestResource(t *testing.T, db *sql.DB, opts ResourceOptions) *domain.Resource {
    // Create resource with sensible defaults
    // Allow overrides via options pattern
}

func CreateTestScheduleEntry(t *testing.T, db *sql.DB, resourceID int32, eventID int32, timeRange TimeRange) *domain.ScheduleEntry {
    // Create schedule assignment
    // Ensure referential integrity
}

func SeedConflictScenario(t *testing.T, db *sql.DB) ConflictTestData {
    // Create complex test scenario:
    // - 5 resources (2 staff, 2 equipment, 1 materials)
    // - 3 events with various assignments
    // - Known conflict patterns for testing
}
```

## Performance Optimization

### Database Indexing Strategy

**Critical indexes** for <100ms conflict detection:
```sql
-- Time range overlap (GiST index for efficient tsrange queries)
CREATE INDEX idx_resources_time_range ON resource_schedule
USING GIST (tsrange(start_time, end_time));

-- Resource filtering (B-tree indexes)
CREATE INDEX idx_resource_schedule_resource_id ON resource_schedule(resource_id);
CREATE INDEX idx_resource_schedule_event_id ON resource_schedule(event_id);

-- Query plan optimization
CREATE INDEX idx_resources_type_available ON resources(type, is_available)
WHERE is_available = true;
```

### Query Optimization Patterns

**Efficient conflict detection**:
```go
// GOOD: Use parameterized queries with resource_id IN clause
params := repository.CheckConflictsParams{
    Column1: []int32{1, 2, 3},  // Multiple resources in single query
    Column2: startTime,
    Column3: endTime,
}

// AVOID: Multiple individual queries (N+1 problem)
for _, resourceID := range resourceIDs {
    // DON'T do separate query per resource
}
```

### Memory Management

**Conflict response optimization**:
```go
// Pre-allocate slices with known capacity
conflicts := make([]domain.Conflict, 0, len(rows))  // Avoid slice growth

// Reuse timestamp parsing
var startTime, endTime time.Time  // Declare once, reuse in loop

// Stream large result sets instead of loading all into memory
```

### Benchmarking & Profiling

```bash
# Performance benchmarks
go test -bench=BenchmarkConflictDetection -benchmem ./internal/scheduler/
go test -bench=. -cpuprofile=cpu.prof -memprofile=mem.prof ./internal/scheduler/

# Profile analysis
go tool pprof cpu.prof          # CPU usage analysis
go tool pprof mem.prof          # Memory allocation analysis
go tool pprof -http=:8081 cpu.prof  # Web UI for profiles

# Query performance monitoring
# Add query timing logs in production:
log.Info().Dur("query_duration", duration).Int("result_count", len(rows)).Msg("Conflict check completed")
```

## Environment Configuration

### Required Environment Variables

```bash
# .env file (copy from .env.example)
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
PORT=8080                               # HTTP server port
LOG_LEVEL=info                         # debug, info, warn, error
CORS_ALLOWED_ORIGINS="http://localhost:3000,https://catering-app.com"

# Development vs Production
ENVIRONMENT=development                 # development, staging, production
ENABLE_QUERY_LOGGING=true             # Log all SQL queries (dev only)
```

### Configuration Loading

**Environment precedence** (`internal/config/config.go`):
1. System environment variables (highest priority)
2. `.env` file in scheduling-service directory
3. `../../.env` file in repository root (shared with Next.js)
4. Default values (lowest priority)

```go
func Load() *Config {
    // 1. Try local .env file
    _ = godotenv.Load(".env")

    // 2. Try repository root .env file
    _ = godotenv.Load("../../.env")

    // 3. Get values with defaults
    return &Config{
        Port:        getEnv("PORT", "8080"),
        DatabaseURL: getEnv("DATABASE_URL", ""),  // Required, no default
        LogLevel:    getEnv("LOG_LEVEL", "info"),
    }
}
```

## Deployment & Production

### Docker Container

```dockerfile
# Multi-stage build for minimal production image
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o scheduler cmd/scheduler/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /app/scheduler /scheduler
EXPOSE 8080
CMD ["/scheduler"]
```

### Health Monitoring

**Health check endpoint** implementation:
- Database connectivity test (`db.Ping()`)
- Response time measurement
- Memory usage reporting
- Ready/Live probe separation for Kubernetes

```bash
# Production health monitoring
curl http://localhost:8080/api/v1/health  # Basic health check

# Detailed metrics (implement if needed)
curl http://localhost:8080/api/v1/metrics # Prometheus metrics endpoint
```

## Troubleshooting

### Common Issues

**Database Connection Problems**:
```bash
# Check PostgreSQL connectivity
psql $DATABASE_URL -c "SELECT 1;"
go run cmd/scheduler/main.go 2>&1 | grep -i "database"

# Verify schema compatibility
sqlc generate  # Should not produce errors
go build cmd/scheduler/main.go  # Should compile without type errors
```

**Performance Issues**:
```bash
# Check query performance
go test -bench=BenchmarkConflictDetection ./internal/scheduler/
# Target: <100ms for realistic data volumes

# Database query analysis
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT ..." # Check query plans
```

**Type Safety Errors** (after schema changes):
```bash
# Regenerate SQLC code
sqlc generate
go mod tidy

# Verify interface compatibility
go test ./internal/repository/...  # Test generated code
```

### Debugging Patterns

**Request tracing**:
```go
log := logger.Get().With().
    Str("request_id", requestID).
    Int("resource_count", len(resourceIDs)).
    Logger()

startTime := time.Now()
// ... execute operation ...
log.Info().Dur("duration", time.Since(startTime)).Msg("Operation completed")
```

**Performance profiling** in development:
```go
import _ "net/http/pprof"  // Enable pprof endpoints

// Access profiling data:
// http://localhost:8080/debug/pprof/
// http://localhost:8080/debug/pprof/goroutine
```

## Integration with Next.js App

### Cross-Service Communication

**Next.js → Scheduling Service**:
```typescript
// apps/web/src/lib/scheduling-client.ts
const response = await fetch(`${SCHEDULING_SERVICE_URL}/api/v1/scheduling/check-conflicts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ resource_ids: [1, 2], start_time: '...', end_time: '...' })
});

const result: CheckConflictsResponse = await response.json();
```

**Shared data models** (keep in sync):
- Go domain types ↔ TypeScript interfaces
- Database schema ↔ Drizzle ORM ↔ SQLC models
- API contracts ↔ tRPC input/output schemas

### Error Handling Integration

**Consistent error format** across services:
```json
{
  "error": "validation_error",
  "message": "end_time must be after start_time",
  "code": "INVALID_TIME_RANGE"
}
```

Maps to tRPC error format in Next.js app for consistent user experience.

---

**Next Steps**: All phases complete. See root `CLAUDE.md` for monorepo context and production deployment guide.