import { documents, documentTypeEnum, events } from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { ALLOWED_MIME_TYPES, DOCUMENTS_BUCKET, MAX_FILE_SIZE, storageClient } from '@/lib/storage';
import { adminProcedure, protectedProcedure, router } from '../trpc';

function getStorage() {
  if (!storageClient) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Storage not configured',
    });
  }
  return storageClient;
}

// Input schemas
const createUploadUrlInput = z.object({
  eventId: z.number().positive(),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z
    .number()
    .positive()
    .max(MAX_FILE_SIZE, `File size must be under ${MAX_FILE_SIZE / 1024 / 1024}MB`),
  mimeType: z
    .string()
    .refine(
      (val) => (ALLOWED_MIME_TYPES as readonly string[]).includes(val),
      'Unsupported file type'
    ),
  type: z.enum(documentTypeEnum.enumValues),
});

const confirmUploadInput = z.object({
  eventId: z.number().positive(),
  name: z.string().trim().min(1).max(255),
  type: z.enum(documentTypeEnum.enumValues),
  storageKey: z.string().min(1).max(1000),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1).max(255),
});

const listByEventInput = z.object({
  eventId: z.number().positive(),
});

const deleteDocumentInput = z.object({
  id: z.number().positive(),
});

const getDownloadUrlInput = z.object({
  id: z.number().positive(),
});

const toggleSharingInput = z.object({
  id: z.number().positive(),
});

export const documentRouter = router({
  createUploadUrl: adminProcedure.input(createUploadUrlInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const storage = getStorage();

    // Verify event exists
    const event = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, input.eventId))
      .then((rows) => rows[0]);

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
    }

    // Generate storage key with UUID for uniqueness
    const uuid = crypto.randomUUID();
    const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `events/${input.eventId}/${uuid}/${sanitizedName}`;

    // Create signed upload URL (valid for 5 minutes)
    const { data, error } = await storage.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUploadUrl(storageKey);

    if (error || !data) {
      logger.error('Failed to create upload URL', error, { context: 'document.createUploadUrl' });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create upload URL',
      });
    }

    logger.info('Upload URL created', {
      eventId: input.eventId,
      storageKey,
      context: 'document.createUploadUrl',
    });

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      storageKey,
    };
  }),

  confirmUpload: adminProcedure.input(confirmUploadInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    // Verify event exists
    const event = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, input.eventId))
      .then((rows) => rows[0]);

    if (!event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' });
    }

    const [document] = await db
      .insert(documents)
      .values({
        eventId: input.eventId,
        name: input.name,
        type: input.type,
        storageKey: input.storageKey,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        uploadedBy: Number(session.user.id),
      })
      .returning();

    logger.info('Document upload confirmed', {
      documentId: document.id,
      eventId: input.eventId,
      context: 'document.confirmUpload',
    });

    return {
      id: document.id,
      eventId: document.eventId,
      name: document.name,
      type: document.type,
      storageKey: document.storageKey,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      sharedWithClient: document.sharedWithClient,
      uploadedBy: document.uploadedBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }),

  listByEvent: protectedProcedure.input(listByEventInput).query(async ({ ctx, input }) => {
    const { db } = ctx;

    const results = await db
      .select()
      .from(documents)
      .where(eq(documents.eventId, input.eventId))
      .orderBy(sql`${documents.createdAt} DESC`);

    return results.map((doc) => ({
      id: doc.id,
      eventId: doc.eventId,
      name: doc.name,
      type: doc.type,
      storageKey: doc.storageKey,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      sharedWithClient: doc.sharedWithClient,
      uploadedBy: doc.uploadedBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }),

  delete: adminProcedure.input(deleteDocumentInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const storage = getStorage();

    // Verify document exists
    const existing = await db
      .select({ id: documents.id, storageKey: documents.storageKey })
      .from(documents)
      .where(eq(documents.id, input.id))
      .then((rows) => rows[0]);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
    }

    // Delete from storage
    const { error } = await storage.storage.from(DOCUMENTS_BUCKET).remove([existing.storageKey]);

    if (error) {
      logger.error('Failed to delete from storage', error, { context: 'document.delete' });
      // Continue with DB deletion even if storage fails
    }

    // Delete from DB
    await db.delete(documents).where(eq(documents.id, input.id));

    logger.info('Document deleted', { documentId: input.id, context: 'document.delete' });

    return { success: true };
  }),

  getDownloadUrl: protectedProcedure.input(getDownloadUrlInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const storage = getStorage();

    const doc = await db
      .select({ id: documents.id, storageKey: documents.storageKey, name: documents.name })
      .from(documents)
      .where(eq(documents.id, input.id))
      .then((rows) => rows[0]);

    if (!doc) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
    }

    // Generate signed download URL (1 hour expiry)
    const { data, error } = await storage.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(doc.storageKey, 3600);

    if (error || !data) {
      logger.error('Failed to create download URL', error, { context: 'document.getDownloadUrl' });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create download URL',
      });
    }

    return {
      url: data.signedUrl,
      fileName: doc.name,
    };
  }),

  toggleSharing: adminProcedure.input(toggleSharingInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;

    const existing = await db
      .select({ id: documents.id, sharedWithClient: documents.sharedWithClient })
      .from(documents)
      .where(eq(documents.id, input.id))
      .then((rows) => rows[0]);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
    }

    const [updated] = await db
      .update(documents)
      .set({
        sharedWithClient: !existing.sharedWithClient,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, input.id))
      .returning();

    logger.info('Document sharing toggled', {
      documentId: input.id,
      sharedWithClient: updated.sharedWithClient,
      context: 'document.toggleSharing',
    });

    return {
      id: updated.id,
      sharedWithClient: updated.sharedWithClient,
    };
  }),
});
