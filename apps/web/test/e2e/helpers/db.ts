/**
 * E2E Test Database Helpers
 *
 * Provides functions for seeding and cleaning the test database.
 * Uses the same database as development - ensure DATABASE_URL points to test database.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from '@catering-event-manager/database/schema';

// Create a separate connection for E2E tests
const connectionString = process.env.DATABASE_URL || 'postgresql://admin:changeme@localhost:5432/catering_events';
const client = postgres(connectionString, { max: 5 });
const db = drizzle(client, { schema });

export { db };

/**
 * Clean all data from the test database
 * Truncates tables in dependency order to avoid foreign key violations
 */
export async function cleanTestDatabase(): Promise<void> {
  // Truncate in reverse dependency order
  await db.execute(sql`TRUNCATE TABLE communications CASCADE`);
  await db.execute(sql`TRUNCATE TABLE resource_schedule CASCADE`);
  await db.execute(sql`TRUNCATE TABLE task_resources CASCADE`);
  await db.execute(sql`TRUNCATE TABLE tasks CASCADE`);
  await db.execute(sql`TRUNCATE TABLE event_status_log CASCADE`);
  await db.execute(sql`TRUNCATE TABLE events CASCADE`);
  await db.execute(sql`TRUNCATE TABLE resources CASCADE`);
  await db.execute(sql`TRUNCATE TABLE clients CASCADE`);
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
}

/**
 * Seed a test user with the given email and role
 */
export async function seedTestUser(
  email: string,
  role: 'administrator' | 'manager',
  password: string = 'testpass123'
): Promise<{ id: number; email: string; role: string }> {
  const passwordHash = await bcrypt.hash(password, 10);
  const name = role === 'administrator' ? 'Test Admin' : 'Test Manager';

  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash,
      name,
      role,
      isActive: true,
    })
    .returning();

  return { id: user.id, email: user.email, role: user.role };
}

/**
 * Seed a test client
 */
export async function seedTestClient(data?: Partial<{
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
}>): Promise<{ id: number; companyName: string }> {
  const [client] = await db
    .insert(schema.clients)
    .values({
      companyName: data?.companyName || 'Test Company',
      contactName: data?.contactName || 'Test Contact',
      email: data?.email || 'client@test.com',
      phone: data?.phone || '555-0100',
    })
    .returning();

  return { id: client.id, companyName: client.companyName };
}

/**
 * Seed a test event
 */
export async function seedTestEvent(data: {
  clientId: number;
  createdBy: number;
  eventName?: string;
  eventDate?: Date;
  status?: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up';
}): Promise<{ id: number; eventName: string; status: string }> {
  const [event] = await db
    .insert(schema.events)
    .values({
      clientId: data.clientId,
      createdBy: data.createdBy,
      eventName: data.eventName || 'Test Event',
      eventDate: data.eventDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: data.status || 'inquiry',
      estimatedAttendees: 50,
      location: 'Test Location',
    })
    .returning();

  return { id: event.id, eventName: event.eventName, status: event.status };
}

/**
 * Seed a test resource
 */
export async function seedTestResource(data?: Partial<{
  name: string;
  type: 'staff' | 'equipment' | 'materials';
  isAvailable: boolean;
}>): Promise<{ id: number; name: string; type: string }> {
  const [resource] = await db
    .insert(schema.resources)
    .values({
      name: data?.name || 'Test Resource',
      type: data?.type || 'staff',
      isAvailable: data?.isAvailable ?? true,
    })
    .returning();

  return { id: resource.id, name: resource.name, type: resource.type };
}

/**
 * Seed a test task
 */
export async function seedTestTask(data: {
  eventId: number;
  title?: string;
  category?: 'pre_event' | 'during_event' | 'post_event';
  status?: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  assignedTo?: number;
}): Promise<{ id: number; title: string; status: string }> {
  const isOverdue = data.dueDate && data.dueDate < new Date() && (data.status || 'pending') !== 'completed';
  const [task] = await db
    .insert(schema.tasks)
    .values({
      eventId: data.eventId,
      title: data.title || 'Test Task',
      category: data.category || 'pre_event',
      status: data.status || 'pending',
      dueDate: data.dueDate || null,
      assignedTo: data.assignedTo || null,
      isOverdue: isOverdue ? true : false,
    })
    .returning();

  return { id: task.id, title: task.title, status: task.status };
}

/**
 * Seed complete test data set for E2E tests
 * Returns references to all created entities
 */
export async function seedTestData(): Promise<{
  adminUser: { id: number; email: string };
  managerUser: { id: number; email: string };
  client: { id: number; companyName: string };
  event: { id: number; eventName: string };
  resource: { id: number; name: string };
}> {
  const adminUser = await seedTestUser('admin@test.com', 'administrator');
  const managerUser = await seedTestUser('manager@test.com', 'manager');
  const client = await seedTestClient();
  const event = await seedTestEvent({
    clientId: client.id,
    createdBy: adminUser.id,
  });
  const resource = await seedTestResource();

  return {
    adminUser: { id: adminUser.id, email: adminUser.email },
    managerUser: { id: managerUser.id, email: managerUser.email },
    client,
    event,
    resource,
  };
}

/**
 * Seed a test client with portal access enabled
 */
export async function seedPortalClient(data?: Partial<{
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
}>): Promise<{ id: number; companyName: string; contactName: string; email: string }> {
  const [client] = await db
    .insert(schema.clients)
    .values({
      companyName: data?.companyName || 'Portal Test Company',
      contactName: data?.contactName || 'Portal Test Contact',
      email: data?.email || 'portal-client@test.com',
      phone: data?.phone || '555-0200',
      portalEnabled: true,
      portalEnabledAt: new Date(),
    })
    .returning();

  return { id: client.id, companyName: client.companyName, contactName: client.contactName, email: client.email };
}

/**
 * Seed a portal client user (magic link auth)
 */
export async function seedPortalUser(
  email: string,
  clientId: number,
  name = 'Portal Test User'
): Promise<{ id: number; email: string; clientId: number }> {
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash: null, // Portal users use magic links
      name,
      role: 'client',
      clientId,
      isActive: true,
    })
    .returning();

  return { id: user.id, email: user.email, clientId: user.clientId ?? clientId };
}

/**
 * Create a magic link token for portal login
 */
export async function createMagicLinkToken(
  email: string,
  expiresInMinutes = 15
): Promise<string> {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Delete existing tokens
  await db.delete(schema.verificationTokens)
    .where(sql`identifier = ${email}`);

  // Insert new token
  await db.insert(schema.verificationTokens).values({
    identifier: email,
    token,
    expires,
  });

  return token;
}

/**
 * Seed complete portal test data
 */
export async function seedPortalTestData(): Promise<{
  client: { id: number; companyName: string; contactName: string; email: string };
  portalUser: { id: number; email: string; clientId: number };
  event: { id: number; eventName: string; status: string };
  adminUser: { id: number; email: string };
}> {
  // Create admin user first (for event creation)
  const adminUser = await seedTestUser('admin@test.com', 'administrator');

  // Create portal-enabled client
  const client = await seedPortalClient({
    companyName: 'Acme Events Inc',
    contactName: 'Jane Smith',
    email: 'jane.smith@acme-events.test',
  });

  // Create portal user
  const portalUser = await seedPortalUser(client.email, client.id, client.contactName);

  // Create an event for this client
  const event = await seedTestEvent({
    clientId: client.id,
    createdBy: adminUser.id,
    eventName: 'Annual Company Gala',
    status: 'planning',
  });

  return { client, portalUser, event, adminUser };
}

/**
 * Close database connection
 * Call this in globalTeardown
 */
export async function closeDatabase(): Promise<void> {
  await client.end();
}
