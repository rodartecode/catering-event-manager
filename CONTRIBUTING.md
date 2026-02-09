# Contributing to Catering Event Manager

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20 LTS
- pnpm 10+
- Go 1.25.0+
- Docker and Docker Compose
- PostgreSQL 17 (via Docker or local)

### Current Tech Stack

This project uses the latest stable versions (as of February 9, 2026):

| Component | Version | Purpose |
| --------- | ------- | ------- |
| Next.js | 16.1.4 | React framework with App Router |
| React | 19.2.3 | Frontend UI library |
| Tailwind CSS | 4.1.18 | Utility-first CSS framework |
| tRPC | 11.8.1 | Type-safe API layer |
| Drizzle ORM | 0.45.1 | TypeScript database ORM |
| Zod | 4.3.6 | Runtime type validation |
| Go Fiber | 3.0.0 | High-performance Go web framework |
| PostgreSQL | 17 | Primary database |
| Vitest | 4.0.18 | Testing framework |
| ESLint | 9.39.2 | Code linting with flat config |
| Biome | 2.3.14 | Code formatting |

**Recent Major Upgrades**: We recently upgraded from older versions to the latest stable releases, including breaking changes from Zod 3→4, Tailwind 3→4, and Next.js 15→16. All breaking changes have been resolved and tests are passing.

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd catering-event-manager

# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d postgres

# Initialize database
cd packages/database
pnpm db:push
pnpm db:seed  # Optional: seed with sample data
cd ../..

# Start development servers
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"
NEXTAUTH_SECRET="your-secret-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
SCHEDULING_SERVICE_URL="http://localhost:8080"
```

## Branch Naming

Use descriptive branch names with prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/add-event-export` |
| `fix/` | Bug fixes | `fix/calendar-timezone` |
| `docs/` | Documentation | `docs/api-endpoints` |
| `refactor/` | Code refactoring | `refactor/event-router` |
| `test/` | Test additions | `test/resource-conflicts` |
| `chore/` | Maintenance | `chore/update-deps` |

## Commit Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(events): add event export to CSV
fix(scheduler): resolve timezone offset in conflict detection
docs(api): document tRPC router procedures
test(tasks): add unit tests for task dependencies
chore(deps): update drizzle-orm to v0.45
```

## Pull Request Process

### Before Submitting

1. **Create a branch** from the latest `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```

2. **Make your changes** following code style guidelines

3. **Run quality checks**:
   ```bash
   pnpm lint        # Check linting
   pnpm type-check  # TypeScript validation
   pnpm test        # Run all tests
   pnpm format      # Format code
   ```

4. **Commit using conventional commits**

### Submitting

1. Push your branch:
   ```bash
   git push -u origin feature/your-feature
   ```

2. Open a Pull Request with:
   - Clear title following commit format
   - Description of changes
   - Link to related issues (if any)
   - Screenshots for UI changes

3. Ensure CI checks pass

### Review Criteria

- Code follows project patterns and style
- Tests cover new functionality
- Documentation updated if needed
- No breaking changes without discussion
- TypeScript types are complete (no `any`)

## Staging Branch Workflow

The project uses a `staging` branch for pre-production validation. Changes flow: feature branch → `staging` → `main` (production).

### Deploying to Staging

```bash
# Option 1: Merge a feature branch into staging
git checkout staging
git merge feature/your-feature
git push origin staging
# CI deploys to staging Vercel + staging Fly.io + staging Supabase

# Option 2: Reset staging to match a specific branch
git checkout staging
git reset --hard feature/your-feature
git push origin staging --force-with-lease
```

### Validating Staging

After pushing to `staging`, verify:
- CI pipeline passes (lint, tests, build, staging deploy)
- Web app is accessible at the staging Vercel URL
- Scheduler health check passes: `curl https://catering-scheduler-staging.fly.dev/api/v1/health`
- Key user flows work as expected

### Promoting Staging to Production

```bash
git checkout main
git merge staging
git push origin main
# CI deploys to production Vercel + production Fly.io + runs production migrations
```

## Code Review Guidelines

### For Authors

- Keep PRs focused and small when possible
- Respond to feedback constructively
- Mark conversations resolved when addressed

### For Reviewers

- Be constructive and specific
- Suggest improvements, don't just criticize
- Approve once satisfied, don't block on style preferences

## Testing Requirements

### Coverage Targets

- Overall: >80% code coverage (currently achieved)
- Scheduling algorithms: 100% coverage (critical business logic)

### Current Test Status

✅ **646 TypeScript tests passing** across 41 test files
✅ **46 Go tests passing** with 91.7% scheduler coverage
✅ **Complete test infrastructure** with PostgreSQL TestContainers

### Test Types

| Type | Location | Command |
| ---- | -------- | ------- |
| Unit | `*.test.ts` co-located | `pnpm test` |
| Integration | `test/integration/` | `pnpm test` |
| E2E | `test/e2e/` | `pnpm test:e2e` |
| Go | `*_test.go` co-located | `go test ./...` |

### Writing Tests

```typescript
// Unit test example (Vitest)
import { describe, it, expect } from 'vitest';

describe('eventRouter', () => {
  it('creates event with valid data', async () => {
    // Test implementation
  });
});
```

```go
// Go test example
func TestConflictDetection(t *testing.T) {
    // Test implementation
}
```

## Architecture Guidelines

### Domain Organization

Files are organized by domain, not technical layers:

```
src/server/routers/
├── event.ts       # Event management
├── task.ts        # Task management
├── resource.ts    # Resource scheduling
└── client.ts      # Client management
```

### Type Safety

- Use Drizzle ORM for TypeScript database queries
- Use SQLC for Go database queries
- Define tRPC input schemas with Zod
- Avoid `any` types

### Package Management

This project stays on the cutting edge with the latest stable packages. When upgrading:

1. **Check Breaking Changes**: Review changelogs before upgrading major versions
2. **Test Thoroughly**: Run all tests after upgrades (`pnpm test`, `go test ./...`)
3. **Update Types**: Regenerate database types after ORM upgrades
4. **Document Changes**: Update README.md with new versions

**Recent Major Upgrades Completed (January 2026)**:

- Next.js 15→16, React 18→19, Tailwind 3→4, Zod 3→4, ESLint 8→9
- All breaking changes resolved and validated

### Security Practices

- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user input with Zod schemas
- Use prepared statements (Drizzle/SQLC handle this)

## Getting Help

- Check existing issues and discussions
- Review the [CLAUDE.md](./CLAUDE.md) for technical context
- Ask questions in PR comments

## License

By contributing, you agree that your contributions will be licensed under the project's license.
