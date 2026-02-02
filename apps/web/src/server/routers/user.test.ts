import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../../test/helpers/db';
import { createUser, resetFactoryCounter } from '../../../test/helpers/factories';
import { createUnauthenticatedCaller } from '../../../test/helpers/trpc';

describe('user router', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
    resetFactoryCounter();
  });

  describe('user.register', () => {
    it('registers a new user with default role', async () => {
      const caller = createUnauthenticatedCaller(db);

      const result = await caller.user.register({
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
      });

      expect(result).toMatchObject({
        name: 'New User',
        email: 'newuser@test.com',
        role: 'manager', // Default role
      });
      expect(result.id).toBeDefined();
    });

    it('registers a user with administrator role', async () => {
      const caller = createUnauthenticatedCaller(db);

      const result = await caller.user.register({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123',
        role: 'administrator',
      });

      expect(result.role).toBe('administrator');
    });

    it('rejects duplicate email', async () => {
      const caller = createUnauthenticatedCaller(db);
      await createUser(db, { email: 'existing@test.com' });

      await expect(
        caller.user.register({
          name: 'Another User',
          email: 'existing@test.com',
          password: 'password123',
        })
      ).rejects.toThrow('A user with this email already exists');
    });

    it('validates email format', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.user.register({
          name: 'Test User',
          email: 'not-an-email',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email');
    });

    it('validates password length', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.user.register({
          name: 'Test User',
          email: 'test@test.com',
          password: 'short',
        })
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('validates name length', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.user.register({
          name: 'A',
          email: 'test@test.com',
          password: 'password123',
        })
      ).rejects.toThrow('Name must be at least 2 characters');
    });

    it('does not return password hash', async () => {
      const caller = createUnauthenticatedCaller(db);

      const result = await caller.user.register({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123',
      });

      // Verify password hash is not in the result
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('password');
    });
  });
});
