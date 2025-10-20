# Catering Event Manager Constitution

<!--
Sync Impact Report - Version 1.0.0 (Initial Ratification)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Version Change: N/A → 1.0.0 (Initial constitution)
Ratification Date: 2025-10-19
Last Amended: 2025-10-19

Principles Established:
  I.   Technology Excellence - Leverage cutting-edge tools and patterns
  II.  Modular Architecture - Focused, cohesive, independently testable modules
  III. Test-First Development - TDD with comprehensive coverage (NON-NEGOTIABLE)
  IV.  API-First Design - Clear contracts and versioning
  V.   Observability & Quality - Structured logging, metrics, performance monitoring
  VI.  Simplicity & Pragmatism - YAGNI, avoid over-engineering

Sections Added:
  - Core Principles (6 principles)
  - Technical Standards (quality gates and tooling)
  - Development Workflow (review process and deployment)
  - Governance (amendment procedures and compliance)

Templates Status:
  ✅ plan-template.md - Constitution Check section aligned
  ✅ spec-template.md - Requirements structure compatible
  ✅ tasks-template.md - Test-first workflow enforced
  ⚠️  Command files - Generic references maintained (no agent-specific names)

Follow-up Actions:
  - None - All placeholders resolved
  - Constitution ready for use in feature development
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->

## Core Principles

### I. Technology Excellence

**Principle**: This project MUST leverage the absolute latest technological advancements and industry best practices. Outdated patterns, deprecated libraries, or legacy architectures are prohibited unless explicitly justified and documented in the Complexity Tracking section.

**Requirements**:
- Always evaluate the latest stable versions of languages, frameworks, and tools
- Prefer modern patterns (e.g., async/await over callbacks, type-safe ORMs over raw SQL)
- Stay current with language ecosystem standards (e.g., latest LTS releases)
- Technology choices MUST be defended with benchmarks, community adoption metrics, or technical superiority documentation

**Rationale**: The project emerged from frustration with obsolete architectural decisions. We refuse to repeat that mistake. Cutting-edge technology provides better performance, developer experience, security, and maintainability when properly evaluated and adopted.

### II. Modular Architecture

**Principle**: Every component MUST be a focused, independently testable module with clear boundaries and single responsibility. Modules MUST fit together cohesively through well-defined interfaces.

**Requirements**:
- Each module has one clear purpose and responsibility
- Modules are independently testable without requiring full system integration
- Module dependencies are explicit and minimal (aim for <5 direct dependencies per module)
- No circular dependencies between modules
- Each module provides comprehensive documentation of its interface and contracts
- Modules MUST be organized by feature/domain, not by technical layer (avoid generic "utils", "helpers", "services" directories)

**Rationale**: Focused modules enable parallel development, easier testing, simpler debugging, and confident refactoring. Cohesive architecture prevents the technical debt and complexity that plagued the inferior design we're avoiding.

### III. Test-First Development (NON-NEGOTIABLE)

**Principle**: Tests MUST be written before implementation. No production code is written until:
1. Tests are written
2. Tests are reviewed and approved
3. Tests fail (proving they test the right behavior)
4. Only then: implement to make tests pass

**Requirements**:
- **Red-Green-Refactor cycle strictly enforced**: Write failing test → Implement → Refactor
- Contract tests for all public module interfaces
- Integration tests for inter-module communication
- Test coverage target: >80% overall, 100% for critical paths (auth, payments, data integrity)
- All tests MUST be automated and run in CI/CD pipeline
- Test failures block all merges to main branch

**Rationale**: Test-first development is non-negotiable because it ensures correctness, prevents regressions, documents expected behavior, and enables fearless refactoring. This standard eliminates entire classes of defects before they occur.

### IV. API-First Design

**Principle**: All modules and services MUST expose their functionality through clearly defined, versioned APIs with comprehensive contracts (OpenAPI, GraphQL schemas, or typed interfaces).

**Requirements**:
- API contracts written before implementation
- All endpoints/functions have documented input/output schemas
- Versioning strategy: MAJOR.MINOR.PATCH semantic versioning
  - MAJOR: Breaking changes to API contracts
  - MINOR: Backward-compatible feature additions
  - PATCH: Backward-compatible bug fixes
- Breaking changes require migration path documentation
- Contract tests validate all API implementations against their schemas

**Rationale**: API-first design enables parallel development, clear communication between teams/modules, automated validation, and smooth evolution. Well-defined contracts prevent integration surprises and enable confident upgrades.

### V. Observability & Quality

**Principle**: Systems MUST be observable, debuggable, and measurable. Every significant operation MUST be logged, metered, and traceable.

**Requirements**:
- Structured logging (JSON format) with correlation IDs for request tracing
- Performance metrics for all critical paths (response times, throughput, error rates)
- Error handling with context preservation (stack traces, request details, user impact)
- Health check endpoints for all services
- Monitoring dashboards for key business and technical metrics
- Alerts configured for critical failures and performance degradation

**Rationale**: You cannot improve what you cannot measure. High engineering standards demand visibility into system behavior, enabling rapid debugging, performance optimization, and proactive issue detection.

### VI. Simplicity & Pragmatism

**Principle**: Start with the simplest solution that meets requirements. Additional complexity MUST be justified by demonstrated need, not anticipated future requirements (YAGNI - You Ain't Gonna Need It).

**Requirements**:
- Default to simplest solution that passes tests and meets requirements
- Complexity additions require justification in Complexity Tracking section of implementation plan
- Architectural patterns (Repository, Factory, Strategy, etc.) MUST solve real current problems, not hypothetical future ones
- Premature optimization is prohibited; optimize only after profiling shows bottlenecks
- Prefer boring, proven solutions over experimental ones unless clear advantage demonstrated

**Rationale**: The best code is no code. Every abstraction, pattern, or framework adds cognitive load and maintenance burden. Balance our drive for excellence with pragmatism: ship working software, measure results, iterate based on real needs.

## Technical Standards

### Quality Gates

All code MUST pass these gates before merging:

1. **Tests**: All automated tests pass (unit, integration, contract)
2. **Coverage**: Meets minimum coverage thresholds (>80% overall)
3. **Linting**: Zero linter errors, zero security warnings
4. **Type Safety**: Full type checking passes (TypeScript strict mode, Python type hints with mypy, etc.)
5. **Performance**: No regressions in critical path performance benchmarks
6. **Documentation**: Public APIs documented, README updated if needed

### Tooling Standards

- **Code Formatting**: Automated (Prettier, Black, gofmt - language-specific)
- **Dependency Management**: Lock files committed, regular security audits
- **Version Control**: Feature branches, squash merges, conventional commit messages
- **CI/CD**: Automated testing, automated deployments to staging, manual approval for production

## Development Workflow

### Review Process

1. Feature specification approved before implementation planning
2. Implementation plan reviewed for constitution compliance
3. Tests written and reviewed before implementation
4. Code review by at least one other engineer
5. All quality gates pass
6. Merge to main after approval

### Deployment Strategy

- **Staging**: Automatic deployment on merge to main
- **Production**: Manual approval after staging validation
- **Rollback**: Automated rollback on health check failures or critical errors
- **Feature Flags**: Required for large features to enable gradual rollout and instant disable

## Governance

### Amendment Procedure

1. Proposed amendments documented with rationale
2. Impact analysis on existing features and templates
3. Team approval (or project owner for solo projects)
4. Migration plan for existing code if needed
5. Version bump according to semantic versioning rules
6. Update all dependent templates and documentation

### Versioning Policy

- **MAJOR**: Backward incompatible governance changes (e.g., removing a principle, making non-negotiable rules optional)
- **MINOR**: New principles added, expanded guidance that doesn't break existing workflows
- **PATCH**: Clarifications, typo fixes, non-semantic improvements

### Compliance Review

- Constitution compliance checked during implementation planning (Constitution Check section)
- Violations MUST be justified in Complexity Tracking section
- Regular architecture reviews to ensure ongoing adherence
- Retrospectives include constitution effectiveness assessment

### Living Document

This constitution is a living document. As the project evolves and we learn, we update these principles. However, changes require deliberate consideration and documented justification to prevent erosion of standards.

**Version**: 1.0.0 | **Ratified**: 2025-10-19 | **Last Amended**: 2025-10-19
