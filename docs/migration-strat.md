# Automating Drizzle migrations for Supabase with Vercel and GitHub Actions

**The cleanest solution**: disable Vercel's auto-deploy and control the entire pipeline through GitHub Actions, running `drizzle-kit migrate` against Supabase's **direct connection** (not the pooled URL) before triggering Vercel deployment via CLI. This guarantees migrations complete successfully before any new code goes live.

The key insight is that Vercel and GitHub Actions both trigger on git push, creating a race condition. By disabling Vercel's Git integration and using `vercel deploy --prebuilt` from GitHub Actions, you gain full control over the sequence: checkout → install → migrate → build → deploy.

---

## The recommended GitHub Actions workflow

This complete workflow handles the entire deployment pipeline with migrations running first. The critical detail for Supabase is using the **direct connection URL** (port 5432) rather than the pooled connection—connection poolers like Supavisor operate in transaction mode and break DDL operations, advisory locks, and prepared statements that migrations require.

```yaml
name: Deploy with Migrations

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  migrate-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Verify migration files are consistent
      - name: Check migration consistency
        run: npx drizzle-kit check

      # Run migrations BEFORE deployment
      - name: Apply database migrations
        run: npx drizzle-kit migrate
        env:
          DATABASE_URL: ${{ secrets.SUPABASE_DIRECT_URL }}

      # Only deploy after migrations succeed
      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        if: github.ref == 'refs/heads/main'
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

**Required secrets** to configure in GitHub repository settings:
- `SUPABASE_DIRECT_URL` — Direct connection string: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- `VERCEL_TOKEN` — From vercel.com/account/tokens
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` — Found in `.vercel/project.json` after running `vercel link` locally

You must also disable Vercel's automatic Git deployments by adding this to `vercel.json`:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

---

## Supabase connection strings matter enormously

Supabase provides three connection types, and using the wrong one for migrations will cause silent failures or hard-to-debug issues:

| Connection Type | Port | When to Use |
|-----------------|------|-------------|
| **Direct** | 5432 | Migrations, pg_dump, any DDL operations |
| **Transaction Pooler** | 6543 | Runtime queries from serverless/edge functions |
| **Session Pooler** | 5432 (pooler subdomain) | IPv4-only CI environments needing pooling |

The transaction pooler (Supavisor) operates in transaction mode, which means advisory locks don't persist across queries, prepared statements fail after schema changes, and `SET` commands like `lock_timeout` reset between queries. These behaviors break virtually every migration tool.

Your Drizzle config should reference the direct URL for migrations:

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Use SUPABASE_DIRECT_URL in CI
  },
  verbose: true,
  strict: true,
});
```

For runtime application code (your Next.js app on Vercel), use the pooled connection with prepared statements disabled:

```typescript
// For runtime queries in your app
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
```

---

## Drizzle-kit push versus migrate for production

**Use `drizzle-kit migrate` for production**, not `push`. The Drizzle documentation explicitly states that `push` is intended for "rapid prototyping" and "local development only"—for production-grade applications, use the migration files approach.

The workflow difference is significant:

**`drizzle-kit push`** compares your TypeScript schema directly against the live database and applies changes immediately. It generates no migration files, provides no audit trail, and makes team coordination difficult. Schema changes happen silently without review.

**`drizzle-kit migrate`** reads SQL migration files from your `drizzle/` folder, compares them against the `__drizzle_migrations` tracking table, and applies only unapplied migrations in sequence. Changes are version-controlled, reviewable in PRs, and reproducible across environments.

The correct production workflow:

1. Modify your Drizzle schema locally (`src/db/schema.ts`)
2. Run `npx drizzle-kit generate --name=descriptive-name` to create migration files
3. Commit the generated SQL files in `drizzle/` to your PR
4. Team reviews the actual SQL changes before merge
5. GitHub Actions runs `drizzle-kit migrate` to apply them post-merge

The generated migration structure looks like this:
```
drizzle/
├── 0001_add-users-table/
│   ├── snapshot.json    # Schema snapshot for future diffing
│   └── migration.sql    # The actual SQL statements
└── 0002_add-email-column/
    ├── snapshot.json
    └── migration.sql
```

---

## Handling migration failures and the rollback problem

**Drizzle does not support automatic rollbacks or down migrations**—this is a known limitation with over 150 upvotes on their GitHub discussions. You must plan for failures differently.

For PostgreSQL specifically, Drizzle runs migrations inside transactions, so a failure mid-migration should roll back that entire migration atomically. The `__drizzle_migrations` table won't record a failed migration, so re-running `drizzle-kit migrate` after fixing the issue works correctly.

Since automatic rollbacks don't exist, adopt a **forward-only migration strategy**:

```sql
-- If migration 0003 added a problematic column:
ALTER TABLE users ADD COLUMN status VARCHAR(20);

-- Create migration 0004 to fix it, rather than rolling back:
ALTER TABLE users DROP COLUMN status;
-- Or fix it:
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
```

For extra safety, back up before migrations in your workflow:

```yaml
- name: Backup before migration
  run: |
    pg_dump ${{ secrets.SUPABASE_DIRECT_URL }} > backup-$(date +%Y%m%d-%H%M%S).sql
  continue-on-error: true  # Don't fail deploy if backup fails, but log it
```

---

## Zero-downtime migrations using expand-and-contract

For schema changes that could break running application instances during deployment, use the **expand-and-contract pattern**. This is essential when renaming columns, changing column types, or adding NOT NULL constraints.

**Phase 1 — Expand**: Add new schema elements alongside existing ones. Old code continues working.

```sql
-- Migration: Add new column, keep old one
ALTER TABLE users ADD COLUMN full_name TEXT;
```

**Phase 2 — Migrate**: Deploy code that writes to both columns. Backfill existing data:

```typescript
// Backfill in batches to avoid long locks
async function backfillFullName() {
  while (true) {
    const result = await db.execute(sql`
      UPDATE users 
      SET full_name = first_name || ' ' || last_name 
      WHERE full_name IS NULL 
      LIMIT 1000
    `);
    if (result.rowCount === 0) break;
    await new Promise(r => setTimeout(r, 100)); // Brief pause between batches
  }
}
```

**Phase 3 — Contract**: After deploying code that only reads the new column, drop the old one in a separate migration.

For **adding indexes** on production tables, always use `CONCURRENTLY` to avoid locking the table:

```sql
-- This MUST be in its own migration file, cannot be in a transaction
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

---

## Preventing concurrent migration runs

When multiple deployments might overlap, use PostgreSQL advisory locks to ensure only one migration runs at a time:

```typescript
// migrate.ts - Custom migration script with locking
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

const MIGRATION_LOCK_ID = 123456789; // Arbitrary but consistent number

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Try to acquire advisory lock
  const [{ acquired }] = await db.execute(
    sql`SELECT pg_try_advisory_lock(${MIGRATION_LOCK_ID}) as acquired`
  );

  if (!acquired) {
    console.log("Another migration is running, skipping...");
    await pool.end();
    return;
  }

  try {
    console.log("Lock acquired, running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations complete!");
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`);
    await pool.end();
  }
}

runMigrations().catch(console.error);
```

Run this in your workflow instead of `drizzle-kit migrate`:

```yaml
- name: Run migrations with locking
  run: npx tsx scripts/migrate.ts
  env:
    DATABASE_URL: ${{ secrets.SUPABASE_DIRECT_URL }}
```

**Critical caveat**: Advisory locks require a direct connection, not the transaction pooler. This is another reason to always use `SUPABASE_DIRECT_URL` for migrations.

---

## Protecting against destructive schema changes

Add a linting step to your PR workflow that detects dangerous operations before they reach production:

```yaml
# .github/workflows/pr-checks.yml
name: PR Migration Checks

on:
  pull_request:
    paths:
      - 'drizzle/**'

jobs:
  lint-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check for destructive operations
        run: |
          if grep -riE "(DROP TABLE|DROP COLUMN|TRUNCATE)" drizzle/*.sql; then
            echo "::error::Destructive migration detected! Requires manual approval."
            exit 1
          fi
```

Combine this with GitHub's CODEOWNERS to require review from specific team members:

```
# .github/CODEOWNERS
drizzle/*.sql @your-team/database-admins
```

For intentional destructive changes, require an explicit comment in the migration:

```sql
-- APPROVED: Dropping legacy table after data migration complete
-- Approved by: @username on 2026-01-15
DROP TABLE legacy_users;
```

---

## Testing migrations in preview environments

For PRs, run migrations against a separate preview database before deploying to Vercel's preview environment:

```yaml
jobs:
  preview-deploy:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci

      # Test migrations on preview database
      - name: Apply migrations to preview
        run: npx drizzle-kit migrate
        env:
          DATABASE_URL: ${{ secrets.SUPABASE_PREVIEW_DIRECT_URL }}

      # Deploy preview (without --prod flag)
      - name: Deploy Vercel preview
        run: |
          npm install -g vercel@latest
          vercel pull --yes --token=${{ secrets.VERCEL_TOKEN }}
          vercel build --token=${{ secrets.VERCEL_TOKEN }}
          vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
```

If you're using **Supabase Branching**, each Git branch automatically gets an isolated database instance. Migrations in your `supabase/migrations` folder run automatically when the branch deploys—though this uses Supabase's native migration system rather than Drizzle.

---

## Complete configuration files

**drizzle.config.ts**:
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations",
    schema: "public",
  },
  verbose: true,
  strict: true,
});
```

**vercel.json**:
```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

**package.json scripts**:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## Conclusion

The most robust pattern for your stack combines four elements: **disable Vercel auto-deploy** to gain control over deployment timing, **always use Supabase's direct connection** for migrations, **use `drizzle-kit migrate`** with version-controlled SQL files rather than `push`, and **run migrations in GitHub Actions before `vercel deploy --prebuilt`** to guarantee schema updates complete before new code goes live.

This approach trades some of Vercel's zero-config simplicity for explicit control over a critical failure point. For a small team, the 20-30 minutes of initial setup prevents hours of debugging mysterious schema mismatch errors. The forward-only migration strategy with advisory locking handles most production scenarios without requiring complex rollback infrastructure.