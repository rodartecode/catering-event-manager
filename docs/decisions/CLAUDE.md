# CLAUDE.md - Architecture Decision Records

ADRs documenting significant architectural decisions for the Catering Event Manager.

## ADR Workflow

### Creating an ADR

```bash
# 1. Copy template
cp TEMPLATE.md 0003-your-decision-title.md

# 2. Fill sections
# - Date, Status, Context, Decision, Consequences, Alternatives

# 3. Commit
git add 0003-*.md
git commit -m "docs(adr): add decision for [description]"
```

### ADR Lifecycle

```
Proposed → Accepted → (Deprecated | Superseded by ADR-XXXX)
```

## Current ADRs

| ADR | Title | Status |
|-----|-------|--------|
| 0001 | Hybrid Microservices Architecture | Accepted |
| 0002 | Expand Automated Testing | Accepted |

## When to Create an ADR

Create an ADR for:
- Technology stack changes (database, framework)
- Breaking changes affecting multiple components
- Performance optimizations with trade-offs
- Security pattern implementations
- Infrastructure or deployment changes

## Template Sections

1. **Date**: When decision was made
2. **Status**: Proposed / Accepted / Deprecated / Superseded
3. **Context**: Problem being solved
4. **Decision**: Specific choice made
5. **Consequences**: Positive / Negative / Neutral outcomes
6. **Alternatives Considered**: Comparison table

## Reading ADRs at Session Start

```bash
# Review accepted decisions for context
cat docs/decisions/0001-*.md
cat docs/decisions/0002-*.md
```

## Related Documentation

- **Project Root**: `../../CLAUDE.md`
- **Learnings**: `../learnings.md`
- **Implementation Guides**: `../implementation-guides/`
