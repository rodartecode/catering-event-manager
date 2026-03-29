import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanDatabase,
  setupTestDatabase,
  type TestDatabase,
  teardownTestDatabase,
} from '../../../test/helpers/db';
import {
  createClient,
  createDocument,
  createEvent,
  createUser,
  resetFactoryCounter,
} from '../../../test/helpers/factories';
import {
  createAdminCaller,
  createManagerCaller,
  createUnauthenticatedCaller,
  testUsers,
} from '../../../test/helpers/trpc';

// Mock storage client
vi.mock('@/lib/storage', () => ({
  getStorageClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/upload?token=abc', token: 'abc' },
          error: null,
        }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/download?token=xyz' },
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  }),
  DOCUMENTS_BUCKET: 'event-documents',
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
}));

describe('document router', () => {
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

  describe('document.createUploadUrl', () => {
    it('creates a signed upload URL when called by admin', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.document.createUploadUrl({
        eventId: event.id,
        fileName: 'contract.pdf',
        fileSize: 1024 * 100,
        mimeType: 'application/pdf',
        type: 'contract',
      });

      expect(result.signedUrl).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.storageKey).toContain(`events/${event.id}/`);
      expect(result.storageKey).toContain('contract.pdf');
    });

    it('rejects when event does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.document.createUploadUrl({
          eventId: 99999,
          fileName: 'test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          type: 'contract',
        })
      ).rejects.toThrow('Event not found');
    });

    it('rejects files over 10MB', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.document.createUploadUrl({
          eventId: 1,
          fileName: 'big.pdf',
          fileSize: 11 * 1024 * 1024,
          mimeType: 'application/pdf',
          type: 'contract',
        })
      ).rejects.toThrow();
    });

    it('rejects unsupported file types', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.document.createUploadUrl({
          eventId: 1,
          fileName: 'script.exe',
          fileSize: 1024,
          mimeType: 'application/x-msdownload',
          type: 'contract',
        })
      ).rejects.toThrow();
    });

    it('rejects unauthenticated users', async () => {
      const caller = createUnauthenticatedCaller(db);

      await expect(
        caller.document.createUploadUrl({
          eventId: 1,
          fileName: 'test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          type: 'contract',
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('rejects non-admin users', async () => {
      const caller = createManagerCaller(db);

      await expect(
        caller.document.createUploadUrl({
          eventId: 1,
          fileName: 'test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          type: 'contract',
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('document.confirmUpload', () => {
    it('records a document in the database', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.document.confirmUpload({
        eventId: event.id,
        name: 'Catering Contract',
        type: 'contract',
        storageKey: `events/${event.id}/uuid/contract.pdf`,
        fileSize: 102400,
        mimeType: 'application/pdf',
      });

      expect(result).toMatchObject({
        eventId: event.id,
        name: 'Catering Contract',
        type: 'contract',
        fileSize: 102400,
        mimeType: 'application/pdf',
        sharedWithClient: false,
        uploadedBy: 1,
      });
      expect(result.id).toBeDefined();
    });

    it('rejects when event does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(
        caller.document.confirmUpload({
          eventId: 99999,
          name: 'Test',
          type: 'contract',
          storageKey: 'events/99999/uuid/test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        })
      ).rejects.toThrow('Event not found');
    });
  });

  describe('document.listByEvent', () => {
    it('returns documents for an event ordered by date descending', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      await createDocument(db, event.id, 1, { name: 'First Doc' });
      await createDocument(db, event.id, 1, { name: 'Second Doc' });

      const result = await caller.document.listByEvent({ eventId: event.id });

      expect(result).toHaveLength(2);
    });

    it('returns empty array when no documents exist', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.document.listByEvent({ eventId: event.id });
      expect(result).toHaveLength(0);
    });

    it('does not return documents from other events', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event1 = await createEvent(db, client.id, 1, { eventName: 'Event 1' });
      const event2 = await createEvent(db, client.id, 1, { eventName: 'Event 2' });

      await createDocument(db, event1.id, 1, { name: 'Event 1 Doc' });
      await createDocument(db, event2.id, 1, { name: 'Event 2 Doc' });

      const result = await caller.document.listByEvent({ eventId: event1.id });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Event 1 Doc');
    });

    it('allows manager (protected) access', async () => {
      const caller = createManagerCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);

      const result = await caller.document.listByEvent({ eventId: event.id });
      expect(result).toHaveLength(0);
    });
  });

  describe('document.delete', () => {
    it('deletes a document', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const doc = await createDocument(db, event.id, 1);

      const result = await caller.document.delete({ id: doc.id });
      expect(result.success).toBe(true);

      // Verify it's gone
      const list = await caller.document.listByEvent({ eventId: event.id });
      expect(list).toHaveLength(0);
    });

    it('rejects when document does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.document.delete({ id: 99999 })).rejects.toThrow('Document not found');
    });
  });

  describe('document.getDownloadUrl', () => {
    it('returns a signed download URL', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const doc = await createDocument(db, event.id, 1, { name: 'Test File' });

      const result = await caller.document.getDownloadUrl({ id: doc.id });

      expect(result.url).toBeDefined();
      expect(result.fileName).toBe('Test File');
    });

    it('rejects when document does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.document.getDownloadUrl({ id: 99999 })).rejects.toThrow(
        'Document not found'
      );
    });
  });

  describe('document.toggleSharing', () => {
    it('toggles shared_with_client from false to true', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const doc = await createDocument(db, event.id, 1);

      const result = await caller.document.toggleSharing({ id: doc.id });
      expect(result.sharedWithClient).toBe(true);
    });

    it('toggles shared_with_client from true to false', async () => {
      const caller = createAdminCaller(db);
      const client = await createClient(db);
      const event = await createEvent(db, client.id, 1);
      const doc = await createDocument(db, event.id, 1, { sharedWithClient: true });

      const result = await caller.document.toggleSharing({ id: doc.id });
      expect(result.sharedWithClient).toBe(false);
    });

    it('rejects when document does not exist', async () => {
      const caller = createAdminCaller(db);

      await expect(caller.document.toggleSharing({ id: 99999 })).rejects.toThrow(
        'Document not found'
      );
    });

    it('rejects non-admin users', async () => {
      const caller = createManagerCaller(db);

      await expect(caller.document.toggleSharing({ id: 1 })).rejects.toThrow('FORBIDDEN');
    });
  });
});
