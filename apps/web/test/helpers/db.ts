import * as schema from '@catering-event-manager/database';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export type TestDatabase = ReturnType<typeof drizzle<typeof schema>>;

let container: StartedPostgreSqlContainer | null = null;
let testDb: TestDatabase | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

/**
 * Set up a PostgreSQL test container and return a Drizzle database instance.
 * The container is reused across all tests in a test file for performance.
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  if (testDb) {
    return testDb;
  }

  // Start PostgreSQL container
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .start();

  const connectionString = container.getConnectionUri();

  // Create postgres client
  sqlClient = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Create Drizzle instance
  testDb = drizzle(sqlClient, { schema });

  // Grant superuser to test_user so it bypasses RLS (matches production
  // where the app connects as the postgres superuser)
  await testDb.execute(sql`ALTER USER test_user WITH SUPERUSER`);

  // Run migrations (push schema to DB)
  await runMigrations(testDb);

  return testDb;
}

/**
 * Apply database schema using Drizzle push-style schema creation.
 * This creates tables based on the schema definitions.
 */
async function runMigrations(db: TestDatabase): Promise<void> {
  // Create enums first
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('administrator', 'manager', 'client');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE event_status AS ENUM ('inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE task_category AS ENUM ('pre_event', 'during_event', 'post_event');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Note: task_priority removed - not in current schema

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE resource_type AS ENUM ('staff', 'equipment', 'materials');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE communication_type AS ENUM ('email', 'phone', 'meeting', 'other');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE expense_category AS ENUM ('labor', 'food_supplies', 'equipment_rental', 'venue', 'transportation', 'decor', 'beverages', 'other');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE payment_method AS ENUM ('cash', 'check', 'credit_card', 'bank_transfer', 'other');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE document_type AS ENUM ('contract', 'menu', 'floor_plan', 'permit', 'photo');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE menu_item_category AS ENUM ('appetizer', 'main', 'side', 'dessert', 'beverage');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE dietary_tag AS ENUM ('vegan', 'vegetarian', 'gluten_free', 'halal', 'kosher', 'dairy_free', 'nut_free');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create tables (clients first for FK references)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      contact_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      address TEXT,
      notes TEXT,
      portal_enabled BOOLEAN NOT NULL DEFAULT false,
      portal_enabled_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Task templates for auto-generating tasks
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS task_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS task_template_items (
      id SERIAL PRIMARY KEY,
      template_id INTEGER NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category task_category NOT NULL,
      days_offset INTEGER NOT NULL,
      depends_on_index INTEGER,
      sort_order INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_task_template_items_template_id ON task_template_items(template_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_task_template_items_sort_order ON task_template_items(template_id, sort_order)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      role user_role NOT NULL DEFAULT 'manager',
      client_id INTEGER REFERENCES clients(id),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      event_name VARCHAR(255) NOT NULL,
      event_date TIMESTAMP NOT NULL,
      location VARCHAR(500),
      estimated_attendees INTEGER,
      notes TEXT,
      status event_status NOT NULL DEFAULT 'inquiry',
      is_archived BOOLEAN NOT NULL DEFAULT false,
      archived_at TIMESTAMP WITH TIME ZONE,
      archived_by INTEGER REFERENCES users(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      template_id INTEGER REFERENCES task_templates(id) ON DELETE SET NULL,
      cloned_from_event_id INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_status_log (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id),
      old_status event_status,
      new_status event_status NOT NULL,
      changed_by INTEGER NOT NULL REFERENCES users(id),
      notes TEXT,
      changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category task_category NOT NULL,
      status task_status NOT NULL DEFAULT 'pending',
      assigned_to INTEGER REFERENCES users(id),
      due_date TIMESTAMP WITH TIME ZONE,
      depends_on_task_id INTEGER,
      is_overdue BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS resources (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type resource_type NOT NULL,
      hourly_rate DECIMAL(10,2),
      is_available BOOLEAN NOT NULL DEFAULT true,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS task_resources (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id),
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, resource_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS resource_schedule (
      id SERIAL PRIMARY KEY,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      event_id INTEGER NOT NULL REFERENCES events(id),
      task_id INTEGER REFERENCES tasks(id),
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS communications (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id),
      client_id INTEGER NOT NULL REFERENCES clients(id),
      type communication_type NOT NULL,
      subject VARCHAR(255),
      notes TEXT,
      contacted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      contacted_by INTEGER REFERENCES users(id),
      follow_up_date TIMESTAMP WITH TIME ZONE,
      follow_up_completed BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id),
      category expense_category NOT NULL,
      description VARCHAR(500) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      vendor VARCHAR(255),
      expense_date TIMESTAMP WITH TIME ZONE NOT NULL,
      notes TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id),
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      status invoice_status NOT NULL DEFAULT 'draft',
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
      tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      notes TEXT,
      due_date TIMESTAMP WITH TIME ZONE,
      sent_at TIMESTAMP WITH TIME ZONE,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS invoice_line_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description VARCHAR(500) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      unit_price DECIMAL(10,2) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      amount DECIMAL(10,2) NOT NULL,
      method payment_method NOT NULL,
      payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
      reference VARCHAR(255),
      notes TEXT,
      recorded_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id),
      name VARCHAR(255) NOT NULL,
      type document_type NOT NULL,
      storage_key VARCHAR(1000) NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type VARCHAR(255) NOT NULL,
      shared_with_client BOOLEAN NOT NULL DEFAULT false,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      cost_per_person DECIMAL(10,2) NOT NULL,
      category menu_item_category NOT NULL,
      allergens TEXT[] DEFAULT '{}',
      dietary_tags dietary_tag[] DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_menus (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id),
      name VARCHAR(255) NOT NULL,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_menu_items (
      id SERIAL PRIMARY KEY,
      event_menu_id INTEGER NOT NULL REFERENCES event_menus(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      quantity_override INTEGER,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_menu_id, menu_item_id)
    )
  `);

  // Portal magic link tokens table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires TIMESTAMP WITH TIME ZONE NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `);

  // Enable RLS on all tables (matches migration 0005_enable_rls.sql)
  // Note: portal_access_log is not created in test helper (not needed for tests)
  const rlsTables = [
    'clients',
    'users',
    'events',
    'event_status_log',
    'tasks',
    'resources',
    'task_resources',
    'resource_schedule',
    'communications',
    'documents',
    'event_menu_items',
    'event_menus',
    'menu_items',
    'expenses',
    'payments',
    'invoice_line_items',
    'invoices',
    'task_templates',
    'task_template_items',
    'verification_tokens',
  ];
  for (const table of rlsTables) {
    await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
  }
}

/**
 * Clean the database by truncating all tables.
 * Call this in beforeEach to ensure test isolation.
 */
export async function cleanDatabase(db: TestDatabase): Promise<void> {
  // Truncate tables in order (respecting foreign key constraints)
  await db.execute(
    sql`TRUNCATE verification_tokens, documents, event_menu_items, event_menus, menu_items, communications, payments, invoice_line_items, invoices, expenses, resource_schedule, task_resources, tasks, event_status_log, events, resources, users, clients, task_template_items, task_templates RESTART IDENTITY CASCADE`
  );
}

/**
 * Tear down the test database and container.
 * Call this in afterAll.
 */
export async function teardownTestDatabase(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = null;
  }
  if (container) {
    await container.stop();
    container = null;
  }
  testDb = null;
}

/**
 * Get the current test database instance.
 * Throws if setupTestDatabase hasn't been called.
 */
export function getTestDatabase(): TestDatabase {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

/**
 * Get the connection URL for the test database container.
 * Throws if setupTestDatabase hasn't been called.
 */
export function getTestDatabaseUrl(): string {
  if (!container) {
    throw new Error('Test database container not initialized. Call setupTestDatabase() first.');
  }
  return container.getConnectionUri();
}
