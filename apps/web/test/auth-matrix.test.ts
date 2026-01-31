import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { vi } from 'vitest';
import {
  setupTestDatabase,
  cleanDatabase,
  teardownTestDatabase,
  type TestDatabase,
} from './helpers/db';
import {
  createTestCaller,
  createClientCaller,
  createUnauthenticatedCaller,
  type TestUser,
} from './helpers/trpc';
import { resetFactoryCounter } from './helpers/factories';
import {
  setupAuthMatrixData,
  getProcedureInput,
  allProcedures,
  type AuthMatrixData,
  type AccessLevel,
} from './helpers/input-factories';

// Mock scheduling service to avoid real HTTP calls
vi.mock('@/server/services/scheduling-client', () => ({
  schedulingClient: {
    checkConflicts: vi.fn().mockResolvedValue({ hasConflicts: false, conflicts: [] }),
    getResourceSchedule: vi.fn().mockResolvedValue({ entries: [] }),
    healthCheck: vi.fn().mockResolvedValue({ status: 'ok', timestamp: new Date().toISOString() }),
  },
  SchedulingClientError: class SchedulingClientError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

/**
 * Authorization Boundary Matrix Test
 *
 * Systematically verifies that every tRPC procedure enforces correct role-based access:
 * - admin procedures reject manager, client, and unauthenticated callers
 * - protected procedures reject unauthenticated callers
 * - client procedures reject admin, manager, and unauthenticated callers
 * - public procedures accept all callers (not tested for rejection)
 *
 * Subscriptions are excluded (different transport mechanism).
 */
describe('authorization boundary matrix', () => {
  let db: TestDatabase;
  let data: AuthMatrixData;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
    resetFactoryCounter();
    data = await setupAuthMatrixData(db);
  });

  // Build role callers
  function getCallerForRole(role: 'admin' | 'manager' | 'client' | 'unauthenticated') {
    switch (role) {
      case 'admin': {
        const user: TestUser = {
          id: String(data.adminUser.id),
          email: data.adminUser.email,
          name: 'Test Admin',
          role: 'administrator',
        };
        return createTestCaller(db, user);
      }
      case 'manager': {
        const user: TestUser = {
          id: String(data.managerUser.id),
          email: data.managerUser.email,
          name: 'Test Manager',
          role: 'manager',
        };
        return createTestCaller(db, user);
      }
      case 'client': {
        return createClientCaller(
          db,
          data.clientUser.clientId,
          String(data.clientUser.id),
          data.clientUser.email
        );
      }
      case 'unauthenticated':
        return createUnauthenticatedCaller(db);
    }
  }

  // Get roles that should be REJECTED for a given access level
  function getUnauthorizedRoles(access: AccessLevel): Array<'admin' | 'manager' | 'client' | 'unauthenticated'> {
    switch (access) {
      case 'admin':
        return ['manager', 'client', 'unauthenticated'];
      case 'protected':
        return ['unauthenticated'];
      case 'client':
        return ['admin', 'manager', 'unauthenticated'];
      case 'public':
        return [];
    }
  }

  // Get expected error for a role being rejected from an access level
  function getExpectedError(access: AccessLevel, role: string): string {
    if (role === 'unauthenticated') return 'UNAUTHORIZED';
    if (access === 'admin') return 'FORBIDDEN';
    // clientProcedure middleware throws 'Client access required' for non-client roles
    if (access === 'client') return 'Client access required';
    return 'FORBIDDEN';
  }

  // Filter to testable procedures (exclude subscriptions and public)
  const testableProcedures = allProcedures.filter(
    (p) => !p.skip && p.access !== 'public'
  );

  // Generate test cases: [procedureKey, role, expectedError, access]
  const testCases: Array<[string, string, string, AccessLevel]> = [];
  for (const proc of testableProcedures) {
    const unauthorizedRoles = getUnauthorizedRoles(proc.access);
    for (const role of unauthorizedRoles) {
      testCases.push([
        `${proc.router}.${proc.procedure}`,
        role,
        getExpectedError(proc.access, role),
        proc.access,
      ]);
    }
  }

  it.each(testCases)(
    '%s rejects %s with %s',
    async (procedureKey, role, expectedError) => {
      const [routerName, procedureName] = procedureKey.split('.');
      const caller = getCallerForRole(role as 'admin' | 'manager' | 'client' | 'unauthenticated');
      const input = getProcedureInput(routerName, procedureName, data);

      // Access the router and procedure dynamically
      const routerObj = (caller as Record<string, unknown>)[routerName] as Record<string, (...args: unknown[]) => Promise<unknown>>;
      const procedureFn = routerObj[procedureName];

      await expect(
        input !== undefined ? procedureFn(input) : procedureFn()
      ).rejects.toThrow(expectedError);
    }
  );

  // Summary test to verify we have the expected number of cases
  it('generates expected number of authorization test cases', () => {
    const adminCount = allProcedures.filter(
      (p) => p.access === 'admin' && !p.skip
    ).length * 3;
    const protectedCount = allProcedures.filter(
      (p) => p.access === 'protected' && !p.skip
    ).length * 1;
    const clientCount = allProcedures.filter(
      (p) => p.access === 'client' && !p.skip
    ).length * 3;

    expect(testCases.length).toBe(adminCount + protectedCount + clientCount);
    expect(testCases.length).toBeGreaterThanOrEqual(90);
  });
});
