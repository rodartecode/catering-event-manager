# CLAUDE.md - Implementation Guides

Step-by-step development guides for major features and infrastructure.

## Available Guides

| Guide | Phase | Status | Tasks |
|-------|-------|--------|-------|
| `PHASE-2-FOUNDATIONAL.md` | Infrastructure | ✅ Complete | 38 |
| `PHASE-3-USER-STORY-1.md` | Event Management | ✅ Complete | 25 |
| `PHASES-4-8-OVERVIEW.md` | Remaining Phases | ⏳ Reference | - |

## Guide Usage

```bash
# Start with prerequisites
cat README.md

# Follow guides sequentially within each phase
cat PHASE-3-USER-STORY-1.md
```

## Guide Structure

Each guide includes:
1. **Prerequisites**: Dependencies, environment setup
2. **Tasks**: Numbered steps with code examples
3. **Verification**: Commands to test implementation
4. **Troubleshooting**: Common issues and solutions

## Verification Commands

After completing guide sections:

```bash
# Database changes
pnpm type-check
pnpm db:studio  # Visual verification

# API changes
pnpm test src/server/routers/

# UI changes
pnpm test:e2e
pnpm test:quality
```

## Creating New Guides

When adding new implementation guides:

1. **Break into phases**: 20-40 tasks each
2. **Include file paths**: Absolute paths like `/apps/web/src/server/routers/event.ts`
3. **Add verification**: Commands after each major section
4. **Document issues**: Common error messages and solutions

## Naming Convention

```
PHASE-N-DESCRIPTIVE-NAME.md
```

Examples:
- `PHASE-4-TASK-MANAGEMENT.md`
- `PHASE-5-RESOURCE-SCHEDULING.md`

## Related Documentation

- **Project Root**: `../../CLAUDE.md`
- **Feature Spec**: `../../specs/001-event-lifecycle-management/`
- **Architecture Decisions**: `../decisions/`
- **Learnings**: `../learnings.md`
