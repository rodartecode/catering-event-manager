import { taskTemplateItems, taskTemplates } from '@catering-event-manager/database/schema';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../../test/helpers/db';
import { createUser, resetFactoryCounter } from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('template router', () => {
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

  // Helper to create a test template
  async function createTestTemplate(
    name: string,
    itemCount: number
  ): Promise<{ id: number; name: string }> {
    const [template] = await db
      .insert(taskTemplates)
      .values({
        name,
        description: `Test template: ${name}`,
      })
      .returning();

    const items = Array.from({ length: itemCount }, (_, i) => ({
      templateId: template.id,
      title: `Task ${i + 1}`,
      description: `Description for task ${i + 1}`,
      category: 'pre_event' as const,
      daysOffset: -(itemCount - i),
      dependsOnIndex: i > 0 ? i : null,
      sortOrder: i + 1,
    }));

    await db.insert(taskTemplateItems).values(items);

    return template;
  }

  describe('template.list', () => {
    it('returns empty list when no templates exist', async () => {
      const caller = createAdminCaller(db);

      const result = await caller.template.list();

      expect(result).toEqual([]);
    });

    it('returns templates with item counts', async () => {
      const caller = createAdminCaller(db);

      await createTestTemplate('Standard Event', 12);
      await createTestTemplate('Large Event', 14);
      await createTestTemplate('Simple Delivery', 8);

      const result = await caller.template.list();

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Large Event', itemCount: 14 }),
          expect.objectContaining({ name: 'Simple Delivery', itemCount: 8 }),
          expect.objectContaining({ name: 'Standard Event', itemCount: 12 }),
        ])
      );
    });

    it('returns templates ordered by name', async () => {
      const caller = createAdminCaller(db);

      await createTestTemplate('Zebra Event', 5);
      await createTestTemplate('Alpha Event', 3);
      await createTestTemplate('Beta Event', 7);

      const result = await caller.template.list();

      expect(result[0].name).toBe('Alpha Event');
      expect(result[1].name).toBe('Beta Event');
      expect(result[2].name).toBe('Zebra Event');
    });

    it('allows manager to list templates', async () => {
      const caller = createManagerCaller(db);

      await createTestTemplate('Test Template', 5);

      const result = await caller.template.list();

      expect(result).toHaveLength(1);
    });

    it('rejects unauthenticated access', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(caller.template.list()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('template.getById', () => {
    it('returns template with all items', async () => {
      const caller = createAdminCaller(db);

      const template = await createTestTemplate('Standard Event', 5);

      const result = await caller.template.getById({ id: template.id });

      expect(result.name).toBe('Standard Event');
      expect(result.items).toHaveLength(5);
      expect(result.items[0]).toMatchObject({
        title: 'Task 1',
        sortOrder: 1,
      });
    });

    it('returns items in sortOrder', async () => {
      const caller = createAdminCaller(db);

      const template = await createTestTemplate('Test Template', 3);

      const result = await caller.template.getById({ id: template.id });

      expect(result.items[0].sortOrder).toBe(1);
      expect(result.items[1].sortOrder).toBe(2);
      expect(result.items[2].sortOrder).toBe(3);
    });

    it('throws NOT_FOUND for non-existent template', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.template.getById({ id: 99999 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Template not found',
      });
    });

    it('allows manager to get template', async () => {
      const caller = createManagerCaller(db);

      const template = await createTestTemplate('Test Template', 3);

      const result = await caller.template.getById({ id: template.id });

      expect(result.name).toBe('Test Template');
    });

    it('rejects unauthenticated access', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(caller.template.getById({ id: 1 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });
});
