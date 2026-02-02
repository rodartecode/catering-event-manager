import { users, verificationTokens } from '@catering-event-manager/database';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../test/helpers/db';
import { createClient, createUser } from '../../test/helpers/factories';

// Direct database access for testing auth functions
// These tests verify the token creation and verification logic at the database level

describe('Portal Auth Flow Integration Tests', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(db);
  });

  describe('magic link token storage', () => {
    it('stores verification token in database', async () => {
      // Create a client user
      const client = await createClient(db, { portalEnabled: true });
      await createUser(db, {
        email: 'client@test.com',
        name: 'Test Client',
        role: 'client',
        clientId: client.id,
      });

      // Simulate token creation (what createMagicLinkToken does)
      const token = 'test-token-12345';
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.insert(verificationTokens).values({
        identifier: 'client@test.com',
        token,
        expires,
      });

      // Verify token was stored
      const storedTokens = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.identifier, 'client@test.com'));

      expect(storedTokens).toHaveLength(1);
      expect(storedTokens[0].token).toBe(token);
      expect(storedTokens[0].identifier).toBe('client@test.com');
    });

    it('allows retrieving valid token', async () => {
      const client = await createClient(db, { portalEnabled: true });
      await createUser(db, {
        email: 'client@test.com',
        name: 'Test Client',
        role: 'client',
        clientId: client.id,
      });

      const token = 'valid-token-xyz';
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await db.insert(verificationTokens).values({
        identifier: 'client@test.com',
        token,
        expires,
      });

      // Query for valid token (not expired)
      const validTokens = await db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, 'client@test.com'),
            eq(verificationTokens.token, token)
          )
        );

      expect(validTokens).toHaveLength(1);
      expect(new Date(validTokens[0].expires).getTime()).toBeGreaterThan(Date.now());
    });

    it('expired token can be filtered out', async () => {
      const client = await createClient(db, { portalEnabled: true });
      await createUser(db, {
        email: 'client@test.com',
        name: 'Test Client',
        role: 'client',
        clientId: client.id,
      });

      const token = 'expired-token-xyz';
      const expires = new Date(Date.now() - 1000); // Already expired

      await db.insert(verificationTokens).values({
        identifier: 'client@test.com',
        token,
        expires,
      });

      // The token exists
      const allTokens = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.identifier, 'client@test.com'));

      expect(allTokens).toHaveLength(1);

      // But it's expired
      expect(new Date(allTokens[0].expires).getTime()).toBeLessThan(Date.now());
    });

    it('can delete used token', async () => {
      const client = await createClient(db, { portalEnabled: true });
      await createUser(db, {
        email: 'client@test.com',
        name: 'Test Client',
        role: 'client',
        clientId: client.id,
      });

      const token = 'one-time-token';
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await db.insert(verificationTokens).values({
        identifier: 'client@test.com',
        token,
        expires,
      });

      // Delete the token (simulating verification)
      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, 'client@test.com'),
            eq(verificationTokens.token, token)
          )
        );

      // Verify token is gone
      const remainingTokens = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.identifier, 'client@test.com'));

      expect(remainingTokens).toHaveLength(0);
    });

    it('replaces existing token for same email', async () => {
      const client = await createClient(db, { portalEnabled: true });
      await createUser(db, {
        email: 'client@test.com',
        name: 'Test Client',
        role: 'client',
        clientId: client.id,
      });

      // First token
      await db.insert(verificationTokens).values({
        identifier: 'client@test.com',
        token: 'first-token',
        expires: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Delete existing tokens (what createMagicLinkToken does)
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, 'client@test.com'));

      // Insert new token
      await db.insert(verificationTokens).values({
        identifier: 'client@test.com',
        token: 'second-token',
        expires: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Only the new token should exist
      const tokens = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.identifier, 'client@test.com'));

      expect(tokens).toHaveLength(1);
      expect(tokens[0].token).toBe('second-token');
    });
  });

  describe('client user verification', () => {
    it('only allows client role users', async () => {
      const client = await createClient(db, { portalEnabled: true });

      // Create a client role user
      const clientUser = await createUser(db, {
        email: 'client@test.com',
        name: 'Client User',
        role: 'client',
        clientId: client.id,
      });

      // Create a staff user with same pattern
      const staffUser = await createUser(db, {
        email: 'staff@test.com',
        name: 'Staff User',
        role: 'manager',
      });

      // Query for client role users
      const clientUsers = await db.query.users.findMany({
        where: eq(users.role, 'client'),
      });

      expect(clientUsers).toHaveLength(1);
      expect(clientUsers[0].email).toBe('client@test.com');
      expect(clientUsers[0].id).toBe(clientUser.id);

      // Staff user should not be included
      expect(clientUsers.find((u) => u.id === staffUser.id)).toBeUndefined();
    });

    it('only allows active users', async () => {
      const client = await createClient(db, { portalEnabled: true });

      // Active client user
      await createUser(db, {
        email: 'active@test.com',
        name: 'Active Client',
        role: 'client',
        clientId: client.id,
        isActive: true,
      });

      // Inactive client user
      await createUser(db, {
        email: 'inactive@test.com',
        name: 'Inactive Client',
        role: 'client',
        clientId: client.id,
        isActive: false,
      });

      // Query for active client users
      const activeClients = await db.query.users.findMany({
        where: and(eq(users.role, 'client'), eq(users.isActive, true)),
      });

      expect(activeClients).toHaveLength(1);
      expect(activeClients[0].email).toBe('active@test.com');
    });

    it('returns user with clientId for portal scoping', async () => {
      const client = await createClient(db, { portalEnabled: true });
      await createUser(db, {
        email: 'client@test.com',
        name: 'Client User',
        role: 'client',
        clientId: client.id,
      });

      const user = await db.query.users.findFirst({
        where: eq(users.email, 'client@test.com'),
      });

      expect(user).not.toBeNull();
      expect(user?.clientId).toBe(client.id);
      expect(user?.role).toBe('client');
    });
  });

  describe('token and user matching', () => {
    it('can verify complete auth flow: user exists + valid token', async () => {
      const client = await createClient(db, { portalEnabled: true });
      const createdUser = await createUser(db, {
        email: 'client@test.com',
        name: 'Test Client',
        role: 'client',
        clientId: client.id,
      });

      const token = 'auth-flow-token';
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await db.insert(verificationTokens).values({
        identifier: 'client@test.com',
        token,
        expires,
      });

      // Step 1: Find valid token
      const tokenRecord = await db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, 'client@test.com'),
            eq(verificationTokens.token, token)
          )
        )
        .then((records) => records[0]);

      expect(tokenRecord).toBeDefined();
      expect(new Date(tokenRecord.expires).getTime()).toBeGreaterThan(Date.now());

      // Step 2: Delete the used token
      await db
        .delete(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, 'client@test.com'),
            eq(verificationTokens.token, token)
          )
        );

      // Step 3: Get the user
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.email, 'client@test.com'),
          eq(users.role, 'client'),
          eq(users.isActive, true)
        ),
      });

      expect(user).not.toBeNull();
      expect(user?.id).toBe(createdUser.id);
      expect(user?.email).toBe('client@test.com');
      expect(user?.clientId).toBe(client.id);

      // Step 4: Token should be consumed (deleted)
      const remainingTokens = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.identifier, 'client@test.com'));

      expect(remainingTokens).toHaveLength(0);
    });

    it('fails auth when user does not exist', async () => {
      // No user created, just a token
      const token = 'orphan-token';
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await db.insert(verificationTokens).values({
        identifier: 'nonexistent@test.com',
        token,
        expires,
      });

      // User lookup should fail
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.email, 'nonexistent@test.com'),
          eq(users.role, 'client'),
          eq(users.isActive, true)
        ),
      });

      expect(user).toBeUndefined();
    });

    it('fails auth with wrong token', async () => {
      const client = await createClient(db, { portalEnabled: true });
      await createUser(db, {
        email: 'client@test.com',
        name: 'Test Client',
        role: 'client',
        clientId: client.id,
      });

      await db.insert(verificationTokens).values({
        identifier: 'client@test.com',
        token: 'correct-token',
        expires: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Try with wrong token
      const tokenRecord = await db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, 'client@test.com'),
            eq(verificationTokens.token, 'wrong-token')
          )
        )
        .then((records) => records[0]);

      expect(tokenRecord).toBeUndefined();
    });

    it('fails auth with wrong email', async () => {
      const client = await createClient(db, { portalEnabled: true });
      await createUser(db, {
        email: 'client@test.com',
        name: 'Test Client',
        role: 'client',
        clientId: client.id,
      });

      await db.insert(verificationTokens).values({
        identifier: 'client@test.com',
        token: 'valid-token',
        expires: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Try with wrong email
      const tokenRecord = await db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.identifier, 'other@test.com'),
            eq(verificationTokens.token, 'valid-token')
          )
        )
        .then((records) => records[0]);

      expect(tokenRecord).toBeUndefined();
    });
  });
});
