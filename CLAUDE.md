# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Project Overview

**Catering Event Lifecycle Management System** - Hybrid microservices monorepo for managing catering events from inquiry to post-event follow-up.

**Stack**: Next.js 16 + Go Fiber v3 + PostgreSQL 17 + tRPC v11 + Drizzle ORM

→ See `/ARCHITECTURE.md` for system design and patterns

## Quick Reference

→ **Commands**: `/COMMANDS.md` - Development, testing, database, build commands
→ **Environment**: `/ENV.md` - Required environment variables
→ **Troubleshooting**: `/TROUBLESHOOTING.md` - Common issues and solutions
→ **Architecture**: `/ARCHITECTURE.md` - System design and patterns

## Directory-Specific Context

| Directory | Context File | Focus |
|-----------|--------------|-------|
| `apps/web/` | `apps/web/CLAUDE.md` | Next.js, tRPC routers, components, testing |
| `apps/scheduling-service/` | `apps/scheduling-service/CLAUDE.md` | Go service, Fiber, scheduling algorithms |
| `packages/database/` | `packages/database/CLAUDE.md` | Drizzle schemas, migrations, database patterns |
| `packages/types/` | `packages/types/CLAUDE.md` | Shared TypeScript types |
| `packages/config/` | `packages/config/CLAUDE.md` | Shared configurations |
| `apps/web/src/components/` | `apps/web/src/components/CLAUDE.md` | Component patterns, domain organization |
| `apps/web/src/lib/` | `apps/web/src/lib/CLAUDE.md` | Utilities, auth, storage, email |
| `apps/web/test/helpers/` | `apps/web/test/helpers/CLAUDE.md` | Test infrastructure, factories, gotchas |
| `docs/` | `docs/CLAUDE.md` | Documentation standards, ADRs |
| `apps/web/src/server/` | `apps/web/src/server/CLAUDE.md` | tRPC router patterns |

## Monorepo Structure

```
apps/
├── web/                    # Next.js 16 (CRUD, auth, UI)
└── scheduling-service/     # Go Fiber v3 (conflict detection)

packages/
├── database/              # Drizzle ORM schemas (shared)
├── types/                 # Shared TypeScript types
└── config/                # Shared configurations

specs/
└── 001-event-lifecycle-management/  # Feature specification

docs/
├── decisions/             # Architecture Decision Records
├── implementation-guides/ # Step-by-step guides
└── learnings.md          # Debugging patterns & solutions
```

## Session Context

**At session start**, read these files:
1. `docs/learnings.md` - Accumulated debugging patterns
2. `docs/decisions/` - Architecture Decision Records

**During development**, append to `docs/learnings.md`:
```markdown
### [2026-MM-DD] Brief title
**Problem**: What went wrong
**Solution**: What fixed it
**Context**: When this applies
```

## Tech Stack Versions

| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | 20 LTS |
| Runtime | Go | 1.26+ |
| Database | PostgreSQL | 17 |
| Frontend | Next.js | 16.2+ |
| Frontend | React | 19.2+ |
| API | tRPC | v11.16+ |
| ORM | Drizzle | 0.45+ |
| Go Web | Fiber | v3.1+ |
| Testing | Vitest | 4.1+ |

## Implementation Status

- **Phase 1**: ✅ Monorepo structure, dependencies, Docker Compose
- **Phase 2**: ✅ Database schema, auth, tRPC, Go service foundation
- **Phase 3**: ✅ Event management (create, track, status, archive)

See `specs/001-event-lifecycle-management/tasks.md` for task breakdown.

## Feature Specifications

Detailed user stories: `specs/001-event-lifecycle-management/spec.md`

**Priority Order**: P1 Event Management → P2 Task Management → P3 Resource Scheduling → P4 Analytics → P5 Client Communication

## Constitution Principles

See `.specify/constitution.md` for 6 core principles:
1. Technology Excellence
2. Modular Architecture
3. Test-First Development
4. API-First Design
5. Observability & Quality
6. Continuous Learning

## Project Tracking

This project is tracked at `/mnt/c/Users/jerod/vault/projects/catering-event-manager.md`.
Update the activity log there when completing meaningful work.

@AGENTS.md
