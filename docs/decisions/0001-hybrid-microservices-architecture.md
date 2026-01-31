# ADR-0001: Hybrid Microservices Architecture (Next.js + Go)

**Date**: 2025-10-19
**Status**: Accepted

## Context

The catering event management system requires both CRUD operations (events, clients, tasks) and performance-critical scheduling algorithms (resource conflict detection across 50+ concurrent events).

A single-stack solution would either:
- Use Node.js for everything (simpler, but scheduling performance insufficient)
- Use Go for everything (faster, but less productive for UI/auth/CRUD)

The scheduling requirement (SC-003: 100% conflict detection, <100ms response) demands algorithmic performance that Node.js cannot reliably achieve.

## Decision

Split the system into two services:

1. **Next.js 15 App** (`apps/web/`)
   - Handles: Authentication, CRUD operations, UI rendering, analytics
   - Uses: tRPC v11, Drizzle ORM, Next-Auth v5
   - Why: Excellent developer experience for rapid feature development

2. **Go Scheduling Service** (`apps/scheduling-service/`)
   - Handles: Resource conflict detection, scheduling optimization
   - Uses: Fiber v3, SQLC
   - Why: 7-11x faster than Node.js for CPU-bound algorithms

Both services share the same PostgreSQL 17 database:
- Drizzle ORM generates TypeScript types from schema
- SQLC generates Go types from SQL queries
- Schema changes cause compile-time errors in both codebases

## Consequences

### Positive

- **Performance**: Go service processes 5k scheduling requests in <1 second
- **Type Safety**: End-to-end type safety in both languages via code generation
- **Right Tool for Job**: Each service optimized for its workload
- **Independent Scaling**: Can scale scheduling service separately under load

### Negative

- **Operational Complexity**: Two deployment targets, two build pipelines
- **Cross-Service Communication**: HTTP calls between services add latency (~5-10ms)
- **Schema Coordination**: Database changes require updates in both codebases

### Neutral

- **Team Skills**: Requires Go proficiency for scheduler maintenance
- **Debugging**: Need to trace across service boundaries

## Alternatives Considered

| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| Node.js only | Simpler stack, one language | Cannot meet <100ms scheduling requirement | Performance blocker |
| Go only | Fastest option | Slower CRUD development, weaker auth ecosystem | Productivity cost too high |
| Serverless functions | Per-request scaling | Cold starts break latency requirement | Scheduling needs consistent performance |
| gRPC between services | Type-safe contracts | Added complexity, HTTP sufficient for MVP | Over-engineering |

## References

- [Fiber benchmarks](https://docs.gofiber.io/extra/benchmarks/) - 5k requests/second vs ~500 for Express
- [research.md](../specs/001-event-lifecycle-management/research.md) - Full technology evaluation
- Constitution Principle I: Technology Excellence
