import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../../test/helpers/db';
import {
  createResource,
  createStaffAvailability,
  createStaffSkill,
  createUser,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('staff router', () => {
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

    // Create test users (admin=1, manager=2)
    await createUser(db, {
      email: testUsers.admin.email,
      name: testUsers.admin.name!,
      role: testUsers.admin.role,
    });
    await createUser(db, {
      email: testUsers.manager.email,
      name: testUsers.manager.name!,
      role: testUsers.manager.role,
    });
  });

  // --- updateSkills ---

  describe('staff.updateSkills', () => {
    it('creates skills for a user', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.staff.updateSkills({
        userId: 2,
        skills: [
          { skill: 'bartender' },
          { skill: 'food_safety_cert', certifiedAt: new Date('2025-01-01') },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.skill).sort()).toEqual(['bartender', 'food_safety_cert']);
      expect(result.find((s) => s.skill === 'food_safety_cert')?.certifiedAt).toBeDefined();
    });

    it('replaces existing skills', async () => {
      const caller = createAdminCaller(db);

      await createStaffSkill(db, 2, { skill: 'bartender' });
      await createStaffSkill(db, 2, { skill: 'server' });

      const result = await caller.staff.updateSkills({
        userId: 2,
        skills: [{ skill: 'sommelier' }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].skill).toBe('sommelier');
    });

    it('clears all skills when empty array', async () => {
      const caller = createAdminCaller(db);

      await createStaffSkill(db, 2, { skill: 'bartender' });

      const result = await caller.staff.updateSkills({
        userId: 2,
        skills: [],
      });

      expect(result).toHaveLength(0);
    });

    it('rejects for non-existent user', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.staff.updateSkills({ userId: 999, skills: [{ skill: 'server' }] })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('rejects for non-admin', async () => {
      const caller = createManagerCaller(db);

      await expect(
        caller.staff.updateSkills({ userId: 2, skills: [{ skill: 'server' }] })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  // --- getSkills ---

  describe('staff.getSkills', () => {
    it('returns skills for a user', async () => {
      const caller = createAdminCaller(db);

      await createStaffSkill(db, 2, { skill: 'bartender' });
      await createStaffSkill(db, 2, { skill: 'sommelier' });

      const result = await caller.staff.getSkills({ userId: 2 });

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.skill).sort()).toEqual(['bartender', 'sommelier']);
    });

    it('returns empty for user with no skills', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.staff.getSkills({ userId: 2 });

      expect(result).toHaveLength(0);
    });

    it('rejects for unauthenticated', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(caller.staff.getSkills({ userId: 2 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  // --- setAvailability ---

  describe('staff.setAvailability', () => {
    it('creates availability slots', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.staff.setAvailability({
        userId: 2,
        slots: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0].dayOfWeek).toBe(1);
      expect(result[0].startTime).toBe('09:00');
      expect(result[1].dayOfWeek).toBe(2);
    });

    it('replaces all existing slots', async () => {
      const caller = createAdminCaller(db);

      await createStaffAvailability(db, 2, { dayOfWeek: 1 });
      await createStaffAvailability(db, 2, { dayOfWeek: 2 });

      const result = await caller.staff.setAvailability({
        userId: 2,
        slots: [{ dayOfWeek: 5, startTime: '08:00', endTime: '12:00' }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe(5);
    });

    it('rejects when endTime is before startTime', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.staff.setAvailability({
          userId: 2,
          slots: [{ dayOfWeek: 1, startTime: '17:00', endTime: '09:00' }],
        })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rejects invalid time format', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.staff.setAvailability({
          userId: 2,
          slots: [{ dayOfWeek: 1, startTime: '9am', endTime: '5pm' }],
        })
      ).rejects.toThrow();
    });

    it('rejects for non-existent user', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.staff.setAvailability({
          userId: 999,
          slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
        })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('rejects for non-admin', async () => {
      const caller = createManagerCaller(db);

      await expect(
        caller.staff.setAvailability({
          userId: 2,
          slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  // --- getAvailability ---

  describe('staff.getAvailability', () => {
    it('returns weekly schedule', async () => {
      const caller = createAdminCaller(db);

      await createStaffAvailability(db, 2, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
      await createStaffAvailability(db, 2, { dayOfWeek: 3, startTime: '10:00', endTime: '14:00' });

      const result = await caller.staff.getAvailability({ userId: 2 });

      expect(result).toHaveLength(2);
      expect(result[0].dayOfWeek).toBe(1);
      expect(result[1].dayOfWeek).toBe(3);
    });

    it('returns empty for no availability', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.staff.getAvailability({ userId: 2 });

      expect(result).toHaveLength(0);
    });
  });

  // --- findAvailable ---

  describe('staff.findAvailable', () => {
    async function setupStaffData() {
      // Create two staff members with resources linked to users
      const staffResource1 = await createResource(db, {
        name: 'Chef Alice',
        type: 'staff',
        userId: 1,
      });
      const staffResource2 = await createResource(db, {
        name: 'Bartender Bob',
        type: 'staff',
        userId: 2,
      });

      // Alice: lead_chef, food_safety_cert
      await createStaffSkill(db, 1, { skill: 'lead_chef' });
      await createStaffSkill(db, 1, { skill: 'food_safety_cert' });

      // Bob: bartender, server
      await createStaffSkill(db, 2, { skill: 'bartender' });
      await createStaffSkill(db, 2, { skill: 'server' });

      // Alice available Mon-Fri 09:00-17:00
      for (let day = 1; day <= 5; day++) {
        await createStaffAvailability(db, 1, {
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
        });
      }

      // Bob available Thu-Sat 16:00-23:00
      for (const day of [4, 5, 6]) {
        await createStaffAvailability(db, 2, {
          dayOfWeek: day,
          startTime: '16:00',
          endTime: '23:00',
        });
      }

      return { staffResource1, staffResource2 };
    }

    it('finds by single skill', async () => {
      const caller = createAdminCaller(db);
      await setupStaffData();

      const result = await caller.staff.findAvailable({ skills: ['bartender'] });

      expect(result).toHaveLength(1);
      expect(result[0].resourceName).toBe('Bartender Bob');
    });

    it('finds by multiple skills (AND logic)', async () => {
      const caller = createAdminCaller(db);
      await setupStaffData();

      const result = await caller.staff.findAvailable({
        skills: ['lead_chef', 'food_safety_cert'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].resourceName).toBe('Chef Alice');
    });

    it('returns empty when no one has all required skills', async () => {
      const caller = createAdminCaller(db);
      await setupStaffData();

      const result = await caller.staff.findAvailable({
        skills: ['bartender', 'lead_chef'],
      });

      expect(result).toHaveLength(0);
    });

    it('finds by day of week', async () => {
      const caller = createAdminCaller(db);
      await setupStaffData();

      // Monday — only Alice (use noon to avoid timezone-shift issues)
      const monday = new Date('2026-04-06T12:00:00');
      expect(monday.getDay()).toBe(1); // Sanity check: Monday
      const result = await caller.staff.findAvailable({ date: monday });

      expect(result).toHaveLength(1);
      expect(result[0].resourceName).toBe('Chef Alice');
    });

    it('finds by day + time range', async () => {
      const caller = createAdminCaller(db);
      await setupStaffData();

      // Friday 16:00-17:00 — both available (Alice 09-17, Bob 16-23)
      const friday = new Date('2026-04-10T12:00:00');
      const result = await caller.staff.findAvailable({
        date: friday,
        startTime: '16:00',
        endTime: '17:00',
      });

      expect(result).toHaveLength(2);
    });

    it('finds by skill + date + time combination', async () => {
      const caller = createAdminCaller(db);
      await setupStaffData();

      // Friday evening bartender — only Bob
      const friday = new Date('2026-04-10T12:00:00');
      const result = await caller.staff.findAvailable({
        skills: ['bartender'],
        date: friday,
        startTime: '18:00',
        endTime: '22:00',
      });

      expect(result).toHaveLength(1);
      expect(result[0].resourceName).toBe('Bartender Bob');
      expect(result[0].skills).toContain('bartender');
    });

    it('returns all linked staff when no filters', async () => {
      const caller = createAdminCaller(db);
      await setupStaffData();

      const result = await caller.staff.findAvailable({});

      expect(result).toHaveLength(2);
    });

    it('excludes unavailable resources', async () => {
      const caller = createAdminCaller(db);
      await setupStaffData();

      // Mark Bob's resource as unavailable
      const { sql: sqlTag } = await import('drizzle-orm');
      const { resources } = await import('@catering-event-manager/database/schema');
      await db.update(resources).set({ isAvailable: false }).where(sqlTag`${resources.userId} = 2`);

      const result = await caller.staff.findAvailable({});

      expect(result).toHaveLength(1);
      expect(result[0].resourceName).toBe('Chef Alice');
    });

    it('excludes resources without user_id link', async () => {
      const caller = createAdminCaller(db);

      // Create unlinked staff resource
      await createResource(db, { name: 'Unlinked Staff', type: 'staff' });

      const result = await caller.staff.findAvailable({});

      expect(result).toHaveLength(0);
    });
  });

  // --- linkUserToResource ---

  describe('staff.linkUserToResource', () => {
    it('links a user to a staff resource', async () => {
      const caller = createAdminCaller(db);
      const resource = await createResource(db, { name: 'New Staff', type: 'staff' });

      const result = await caller.staff.linkUserToResource({
        userId: 2,
        resourceId: resource.id,
      });

      expect(result.userId).toBe(2);
    });

    it('rejects non-staff resource', async () => {
      const caller = createAdminCaller(db);
      const resource = await createResource(db, { name: 'Oven', type: 'equipment' });

      await expect(
        caller.staff.linkUserToResource({ userId: 2, resourceId: resource.id })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rejects already-linked resource', async () => {
      const caller = createAdminCaller(db);
      const resource = await createResource(db, {
        name: 'Linked Staff',
        type: 'staff',
        userId: 1,
      });

      await expect(
        caller.staff.linkUserToResource({ userId: 2, resourceId: resource.id })
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('rejects if user already linked to another resource', async () => {
      const caller = createAdminCaller(db);
      await createResource(db, { name: 'Staff A', type: 'staff', userId: 2 });
      const resource2 = await createResource(db, { name: 'Staff B', type: 'staff' });

      await expect(
        caller.staff.linkUserToResource({ userId: 2, resourceId: resource2.id })
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('rejects for non-existent user', async () => {
      const caller = createAdminCaller(db);
      const resource = await createResource(db, { name: 'Staff', type: 'staff' });

      await expect(
        caller.staff.linkUserToResource({ userId: 999, resourceId: resource.id })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('rejects for non-admin', async () => {
      const caller = createManagerCaller(db);
      const resource = await createResource(db, { name: 'Staff', type: 'staff' });

      await expect(
        caller.staff.linkUserToResource({ userId: 2, resourceId: resource.id })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  // --- getStaffList ---

  describe('staff.getStaffList', () => {
    it('lists staff-type resources', async () => {
      const caller = createAdminCaller(db);

      await createResource(db, { name: 'Chef', type: 'staff', userId: 2 });
      await createResource(db, { name: 'Oven', type: 'equipment' });

      const result = await caller.staff.getStaffList({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Chef');
    });

    it('includes linked user info and skill count', async () => {
      const caller = createAdminCaller(db);

      await createResource(db, { name: 'Chef Alice', type: 'staff', userId: 2 });
      await createStaffSkill(db, 2, { skill: 'lead_chef' });
      await createStaffSkill(db, 2, { skill: 'food_safety_cert' });

      const result = await caller.staff.getStaffList({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].userName).toBe(testUsers.manager.name);
      expect(Number(result.items[0].skillCount)).toBe(2);
    });

    it('supports search query', async () => {
      const caller = createAdminCaller(db);

      await createResource(db, { name: 'Chef Alice', type: 'staff' });
      await createResource(db, { name: 'Bartender Bob', type: 'staff' });

      const result = await caller.staff.getStaffList({ query: 'Alice' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Chef Alice');
    });

    it('supports cursor pagination', async () => {
      const caller = createAdminCaller(db);

      await createResource(db, { name: 'A Staff', type: 'staff' });
      await createResource(db, { name: 'B Staff', type: 'staff' });
      await createResource(db, { name: 'C Staff', type: 'staff' });

      const page1 = await caller.staff.getStaffList({ limit: 2 });

      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await caller.staff.getStaffList({ limit: 2, cursor: page1.nextCursor! });

      expect(page2.items).toHaveLength(1);
      expect(page2.nextCursor).toBeNull();
    });
  });

  // --- getStaffProfile ---

  describe('staff.getStaffProfile', () => {
    it('returns full profile with skills and availability', async () => {
      const caller = createAdminCaller(db);

      const resource = await createResource(db, {
        name: 'Chef Alice',
        type: 'staff',
        userId: 2,
        hourlyRate: 50,
      });
      await createStaffSkill(db, 2, { skill: 'lead_chef' });
      await createStaffAvailability(db, 2, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });

      const result = await caller.staff.getStaffProfile({ resourceId: resource.id });

      expect(result.name).toBe('Chef Alice');
      expect(result.userName).toBe(testUsers.manager.name);
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].skill).toBe('lead_chef');
      expect(result.availability).toHaveLength(1);
      expect(result.availability[0].dayOfWeek).toBe(1);
    });

    it('returns profile without user link', async () => {
      const caller = createAdminCaller(db);

      const resource = await createResource(db, { name: 'Unlinked Staff', type: 'staff' });

      const result = await caller.staff.getStaffProfile({ resourceId: resource.id });

      expect(result.name).toBe('Unlinked Staff');
      expect(result.userId).toBeNull();
      expect(result.skills).toHaveLength(0);
      expect(result.availability).toHaveLength(0);
    });

    it('rejects for non-staff resource', async () => {
      const caller = createAdminCaller(db);

      const resource = await createResource(db, { name: 'Oven', type: 'equipment' });

      await expect(caller.staff.getStaffProfile({ resourceId: resource.id })).rejects.toMatchObject(
        { code: 'NOT_FOUND' }
      );
    });

    it('rejects for non-existent resource', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.staff.getStaffProfile({ resourceId: 999 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });
});
