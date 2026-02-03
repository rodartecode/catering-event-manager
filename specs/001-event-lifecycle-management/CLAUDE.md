# CLAUDE.md - Feature Specification

Event Lifecycle Management feature specification and task tracking.

## Specification Files

| File | Purpose |
|------|---------|
| `spec.md` | User stories, requirements, success criteria |
| `tasks.md` | 200 tasks across 8 phases with status tracking |
| `plan.md` | Implementation planning and approach |
| `data-model.md` | Database schema design |
| `quickstart.md` | Getting started guide |
| `research.md` | Technology research and decisions |

## Navigation

### User Stories
```bash
# View requirements and success criteria
cat spec.md
```

### Task Tracking
```bash
# View all tasks with status
cat tasks.md

# Task status markers:
# ✅ - Complete
# 🚧 - In Progress
# ⏳ - Pending
```

### Phase Overview
- **Phase 1**: ✅ Monorepo structure
- **Phase 2**: ✅ Database, auth, tRPC, Go service
- **Phase 3**: ✅ Event management MVP
- **Phase 4**: ⏳ Task management
- **Phase 5**: ⏳ Resource scheduling
- **Phase 6**: ⏳ Analytics
- **Phase 7**: ⏳ Client portal
- **Phase 8**: ⏳ Client communication

## Priority Order

**P1**: Event Management (create, track, history)
**P2**: Task Management (assign, complete, dependencies)
**P3**: Resource Scheduling (assign, conflicts, utilization)
**P4**: Analytics & Reporting
**P5**: Client Communication

## Success Criteria Reference

| Code | Target | Description |
|------|--------|-------------|
| SC-001 | <5 min | Event creation time |
| SC-003 | 100% | Resource conflict detection |
| SC-004 | <2 sec | Status update visibility |
| SC-005 | <10 sec | Report generation |
| SC-007 | 50+ | Concurrent events |

## Subdirectories

- `checklists/` - Implementation checklists
- `contracts/` - API contract definitions

## Related Documentation

- **Project Root**: `../../CLAUDE.md`
- **Implementation Guides**: `../../docs/implementation-guides/`
- **Architecture Decisions**: `../../docs/decisions/`
