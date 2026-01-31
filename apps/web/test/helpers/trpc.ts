import { appRouter } from '@/server/routers/_app';
import { createCallerFactory } from '@/server/trpc';
import type { TestDatabase } from './db';

/**
 * Test user type matching the session user shape.
 */
export interface TestUser {
  id: string;
  email: string;
  name: string | null;
  role: 'administrator' | 'manager' | 'client';
  clientId?: number;
}

/**
 * Pre-built test users for common scenarios.
 */
export const testUsers = {
  admin: {
    id: '1',
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'administrator' as const,
  },
  manager: {
    id: '2',
    email: 'manager@test.com',
    name: 'Test Manager',
    role: 'manager' as const,
  },
};

/**
 * Create a tRPC caller using the exported factory.
 */
const createCaller = createCallerFactory(appRouter);

/**
 * Create an authenticated test caller.
 *
 * @param db - The test database instance
 * @param user - The user to authenticate as (null for unauthenticated)
 * @returns A tRPC caller that can be used to call router procedures
 *
 * @example
 * ```typescript
 * const db = await setupTestDatabase();
 * const caller = createTestCaller(db, testUsers.admin);
 *
 * const event = await caller.event.create({
 *   clientId: 1,
 *   eventName: 'Test Event',
 *   eventDate: new Date(),
 * });
 * ```
 */
export function createTestCaller(db: TestDatabase, user: TestUser | null = null) {
  // Use type assertion to handle context type compatibility
  // The test db is compatible with the real db at runtime
  const ctx = {
    db: db as unknown as typeof import('@catering-event-manager/database/client').db,
    session: user
      ? {
          user,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }
      : null,
    headers: new Headers(),
  };

  return createCaller(ctx);
}

/**
 * Create an admin test caller (convenience method).
 */
export function createAdminCaller(db: TestDatabase) {
  return createTestCaller(db, testUsers.admin);
}

/**
 * Create a manager test caller (convenience method).
 */
export function createManagerCaller(db: TestDatabase) {
  return createTestCaller(db, testUsers.manager);
}

/**
 * Create an unauthenticated test caller (convenience method).
 */
export function createUnauthenticatedCaller(db: TestDatabase) {
  return createTestCaller(db, null);
}

/**
 * Create a client portal test caller.
 *
 * @param db - The test database instance
 * @param clientId - The client ID to scope queries to
 * @param userId - The user ID (defaults to '3')
 * @param email - The user's email (defaults to 'client@test.com')
 */
export function createClientCaller(
  db: TestDatabase,
  clientId: number,
  userId = '3',
  email = 'client@test.com'
) {
  const user = {
    id: userId,
    email,
    name: 'Test Client User',
    role: 'client' as const,
    clientId,
  };
  return createTestCaller(db, user);
}

/**
 * Type for the test caller return type.
 */
export type TestCaller = ReturnType<typeof createTestCaller>;
