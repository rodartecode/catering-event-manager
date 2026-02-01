# CLAUDE.md - Documentation Guide

This directory contains documentation, architecture decisions, implementation guides, and learnings for the Catering Event Manager project.

## Directory Structure

```
docs/
├── decisions/                    # Architecture Decision Records (ADRs)
│   ├── TEMPLATE.md              # ADR template format
│   ├── 0001-*.md               # Numbered ADRs
│   └── 0002-*.md
├── implementation-guides/        # Step-by-step development guides
│   ├── README.md               # Guide overview and usage
│   ├── PHASE-2-FOUNDATIONAL.md # Infrastructure setup (38 tasks)
│   ├── PHASE-3-USER-STORY-1.md # MVP event management (25 tasks)
│   └── PHASES-4-8-OVERVIEW.md  # Remaining phases reference
├── ui-validation/               # UI testing artifacts
│   └── VALIDATION-REPORT.md    # Manual testing reports
├── learnings.md                # Accumulated debugging patterns & solutions
├── COMPONENTS.md               # Component library documentation
├── DEPLOYMENT.md               # Production deployment guide
└── PERFORMANCE.md              # Performance optimization notes
```

## Architecture Decision Records (ADRs)

**Purpose**: Document significant architectural decisions with context and consequences.

**When to create an ADR**:
- Technology stack changes (database, framework, service architecture)
- Breaking changes that affect multiple components
- Performance optimization decisions with trade-offs
- Security pattern implementations
- Infrastructure or deployment approach changes

**ADR Workflow**:
```bash
# 1. Copy template
cp docs/decisions/TEMPLATE.md docs/decisions/0003-your-decision-title.md

# 2. Fill sections: Context, Decision, Consequences, Alternatives
# 3. Set status: Proposed → Accepted → (Deprecated/Superseded)
# 4. Commit with descriptive message
git add docs/decisions/0003-*.md
git commit -m "docs(adr): add decision for [brief description]"
```

**ADR Format** (from TEMPLATE.md):
- **Date**: Decision timestamp
- **Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
- **Context**: Problem being solved
- **Decision**: Specific choice made
- **Consequences**: Positive/Negative/Neutral outcomes
- **Alternatives Considered**: Comparison table of rejected options

## Implementation Guides

**Purpose**: Step-by-step guides for implementing major features and infrastructure.

**Guide Usage**:
```bash
# Start with prerequisites check
cat docs/implementation-guides/README.md

# Follow guides sequentially within each phase
# Example: Phase 2 (Infrastructure)
open docs/implementation-guides/PHASE-2-FOUNDATIONAL.md

# Each guide includes:
# - Complete code examples with exact file paths
# - Verification commands to test each section
# - Common troubleshooting tips
```

**Guide Structure**:
- **Prerequisites**: Dependencies, environment setup
- **Tasks**: Numbered steps with code examples
- **Verification**: Commands to test implementation
- **Troubleshooting**: Common issues and solutions

**Creating New Guides**:
- Break large features into phases (20-40 tasks each)
- Include exact file paths: `/apps/web/src/server/routers/event.ts`
- Add verification commands after each major section
- Document common error messages and solutions

## Learnings Documentation

**Purpose**: Capture debugging patterns, gotchas, and solutions for future sessions.

**When to document learnings**:
- Non-obvious bugs that took >30 minutes to solve
- Framework-specific gotchas (tRPC, Drizzle, Fiber)
- Testing patterns that work well
- Performance optimization discoveries
- Environment setup issues

**Learning Entry Format** (append to `learnings.md`):
```markdown
### [2026-MM-DD] Brief descriptive title

**Problem**: What went wrong or was confusing
**Solution**: What fixed it or worked well
**Context**: When this applies, code examples if helpful
```

**Learning Categories**:
- Database & Drizzle
- tRPC & API Layer
- Go Scheduler Service
- Frontend & UI
- Testing & Quality
- Environment & Tooling

**Session Onboarding**: Always read `learnings.md` at session start to avoid re-learning known issues.

## UI Validation Assets

**Purpose**: Store manual testing reports and visual regression artifacts.

**Validation Reports** (`ui-validation/VALIDATION-REPORT.md`):
- Manual UI/UX flow testing results
- Authentication flow validation
- Dashboard functionality checks
- Critical bug reports and fixes

**Visual Regression** (future):
- Playwright screenshot baselines
- Test artifacts and failure reports
- Baseline update procedures

## Documentation Standards

### Markdown Formatting
- Use `##` for main sections, `###` for subsections
- Code blocks: specify language (\`\`\`typescript, \`\`\`bash)
- File paths: absolute paths `/apps/web/src/...`
- Commands: wrap in code blocks with description
- Tables: align columns, include headers

### Cross-Referencing
- Link to specs: `specs/001-event-lifecycle-management/spec.md`
- Reference ADRs: "See ADR-0001 for architecture rationale"
- Point to guides: "Follow PHASE-2-FOUNDATIONAL.md for setup"
- Cite learnings: "Known issue documented in learnings.md"

### File Naming
- ADRs: `0001-descriptive-title.md` (zero-padded numbers)
- Guides: `PHASE-N-DESCRIPTIVE-NAME.md` (all caps)
- Reports: `VALIDATION-REPORT.md` or `DOCS_SYNC_REPORT_YYYY-MM-DD.md`
- General docs: `COMPONENTS.md`, `DEPLOYMENT.md` (all caps)

## Development Workflow

### During Feature Development
```bash
# 1. Document any ADR-worthy decisions
# 2. Update relevant implementation guides if process changes
# 3. Append learnings.md with any debugging discoveries
# 4. Update VALIDATION-REPORT.md after manual testing
```

### Documentation Maintenance
```bash
# Periodic review (monthly)
# - Archive completed implementation guides
# - Update ADR statuses (Accepted → Deprecated if superseded)
# - Clean up outdated entries in learnings.md
# - Refresh validation reports after major UI changes
```

### Code-Docs Sync
- Update guides when changing file structure
- Refresh code examples in guides after refactoring
- Document breaking changes in both ADRs and learnings
- Keep CLAUDE.md files synchronized with documentation changes

## Quality Gates

Documentation follows same quality standards as code:
- Spell check before committing
- Verify all links and file paths
- Test command examples in guides
- Review for clarity and completeness
- Maintain consistent formatting

**Documentation Coverage**: Key architectural decisions, implementation patterns, and debugging solutions must be documented for maintainability and knowledge sharing.