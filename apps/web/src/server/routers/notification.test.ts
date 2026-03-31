import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../../test/helpers/db';
import {
  createNotification,
  createUser,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

describe('notification router', () => {
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

  describe('notification.list', () => {
    it('returns only the current user notifications', async () => {
      const caller = createAdminCaller(db);

      // Create notifications for admin (user 1) and manager (user 2)
      await createNotification(db, 1, { title: 'Admin notification' });
      await createNotification(db, 2, { title: 'Manager notification' });

      const result = await caller.notification.list({ limit: 50 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Admin notification');
    });

    it('filters unread only when requested', async () => {
      const caller = createAdminCaller(db);

      await createNotification(db, 1, { title: 'Unread' });
      await createNotification(db, 1, { title: 'Read', readAt: new Date() });

      const unread = await caller.notification.list({ limit: 50, unreadOnly: true });
      expect(unread.items).toHaveLength(1);
      expect(unread.items[0].title).toBe('Unread');

      const all = await caller.notification.list({ limit: 50, unreadOnly: false });
      expect(all.items).toHaveLength(2);
    });

    it('supports cursor pagination', async () => {
      const caller = createAdminCaller(db);

      // Create 5 notifications
      for (let i = 0; i < 5; i++) {
        await createNotification(db, 1, { title: `Notification ${i}` });
      }

      const page1 = await caller.notification.list({ limit: 3 });
      expect(page1.items).toHaveLength(3);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await caller.notification.list({ limit: 3, cursor: page1.nextCursor! });
      expect(page2.items).toHaveLength(2);
      expect(page2.nextCursor).toBeUndefined();
    });

    it('returns items in descending order by created_at', async () => {
      const caller = createAdminCaller(db);

      await createNotification(db, 1, { title: 'First' });
      await createNotification(db, 1, { title: 'Second' });
      await createNotification(db, 1, { title: 'Third' });

      const result = await caller.notification.list({ limit: 50 });

      // Most recent first
      expect(result.items[0].title).toBe('Third');
      expect(result.items[2].title).toBe('First');
    });

    it('rejects unauthenticated requests', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(caller.notification.list({ limit: 50 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('notification.markRead', () => {
    it('marks a notification as read', async () => {
      const caller = createAdminCaller(db);
      const notif = await createNotification(db, 1, { title: 'Test' });

      const result = await caller.notification.markRead({ id: notif.id });
      expect(result.id).toBe(notif.id);

      // Verify it's now read
      const list = await caller.notification.list({ limit: 50, unreadOnly: true });
      expect(list.items).toHaveLength(0);
    });

    it('rejects marking another user notification', async () => {
      const adminCaller = createAdminCaller(db);
      // Create notification for manager (user 2)
      const notif = await createNotification(db, 2, { title: 'Manager only' });

      await expect(adminCaller.notification.markRead({ id: notif.id })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('returns NOT_FOUND for non-existent notification', async () => {
      const caller = createAdminCaller(db);
      await expect(caller.notification.markRead({ id: 99999 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects unauthenticated requests', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(caller.notification.markRead({ id: 1 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('notification.markAllRead', () => {
    it('marks all unread notifications as read and returns count', async () => {
      const caller = createAdminCaller(db);

      await createNotification(db, 1, { title: 'Unread 1' });
      await createNotification(db, 1, { title: 'Unread 2' });
      await createNotification(db, 1, { title: 'Already read', readAt: new Date() });

      const result = await caller.notification.markAllRead();
      expect(result.count).toBe(2);

      // Verify all are now read
      const unread = await caller.notification.list({ limit: 50, unreadOnly: true });
      expect(unread.items).toHaveLength(0);
    });

    it('does not affect other users notifications', async () => {
      const adminCaller = createAdminCaller(db);
      const managerCaller = createManagerCaller(db);

      await createNotification(db, 1, { title: 'Admin notif' });
      await createNotification(db, 2, { title: 'Manager notif' });

      await adminCaller.notification.markAllRead();

      // Manager's notification should still be unread
      const managerUnread = await managerCaller.notification.getUnreadCount();
      expect(managerUnread.count).toBe(1);
    });

    it('returns count 0 when no unread notifications', async () => {
      const caller = createAdminCaller(db);
      const result = await caller.notification.markAllRead();
      expect(result.count).toBe(0);
    });

    it('rejects unauthenticated requests', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(caller.notification.markAllRead()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('notification.getUnreadCount', () => {
    it('returns correct unread count', async () => {
      const caller = createAdminCaller(db);

      await createNotification(db, 1, { title: 'Unread 1' });
      await createNotification(db, 1, { title: 'Unread 2' });
      await createNotification(db, 1, { title: 'Read', readAt: new Date() });

      const result = await caller.notification.getUnreadCount();
      expect(result.count).toBe(2);
    });

    it('returns 0 when no notifications', async () => {
      const caller = createAdminCaller(db);
      const result = await caller.notification.getUnreadCount();
      expect(result.count).toBe(0);
    });

    it('only counts current user notifications', async () => {
      const caller = createAdminCaller(db);

      await createNotification(db, 1, { title: 'Admin' });
      await createNotification(db, 2, { title: 'Manager' });
      await createNotification(db, 2, { title: 'Manager 2' });

      const result = await caller.notification.getUnreadCount();
      expect(result.count).toBe(1);
    });

    it('rejects unauthenticated requests', async () => {
      const caller = createUnauthenticatedCaller(db);
      await expect(caller.notification.getUnreadCount()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });
});
