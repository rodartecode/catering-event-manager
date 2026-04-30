import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const MIGRATIONS_FOLDER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Applies any pending journal-tracked Drizzle migrations.
 *
 * Hand-written migrations not in `meta/_journal.json` (RLS files,
 * `0013_updated_at_triggers_and_fk_indexes.sql`) are NOT applied here —
 * apply those manually via `psql -f` before deploying journal-tracked
 * migrations that depend on objects they create (e.g., the
 * `update_updated_at_column()` trigger function).
 */
export async function runMigrations(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
