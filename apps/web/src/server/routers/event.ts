import {
  clients,
  eventStatusLog,
  events,
  tasks,
  taskTemplateItems,
  taskTemplates,
  users,
  venues,
} from '@catering-event-manager/database/schema';
import { TRPCError } from '@trpc/server';
import { addDays, differenceInMilliseconds } from 'date-fns';
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { ImportError } from '../services/csv';
import { buildFieldMapping, generateCSV, parseCSV, validateImportRows } from '../services/csv';
import { createNotifications } from '../services/notifications';
import { adminProcedure, protectedProcedure, router } from '../trpc';

// Event status enum for validation
const eventStatusEnum = z.enum([
  'inquiry',
  'planning',
  'preparation',
  'in_progress',
  'completed',
  'follow_up',
]);

// Event create input schema
const createEventInput = z.object({
  clientId: z.number().positive(),
  eventName: z.string().trim().min(1).max(255),
  eventDate: z.coerce.date(),
  location: z.string().max(500).optional(),
  estimatedAttendees: z.number().positive().optional(),
  notes: z.string().optional(),
  templateId: z.number().positive().optional(),
  venueId: z.number().positive().optional(),
});

// Event list input schema
const listEventsInput = z.object({
  status: z
    .enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up', 'all'])
    .optional(),
  clientId: z.number().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  query: z.string().min(2).max(100).optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().optional(),
});

// Event update input schema
const updateEventInput = z.object({
  id: z.number().positive(),
  eventName: z.string().trim().min(1).max(255).optional(),
  eventDate: z.coerce.date().optional(),
  location: z.string().max(500).optional(),
  estimatedAttendees: z.number().positive().optional(),
  notes: z.string().optional(),
  venueId: z.number().positive().nullable().optional(),
});

// Event status update input schema
const updateStatusInput = z.object({
  id: z.number().positive(),
  newStatus: eventStatusEnum,
  notes: z.string().optional(),
});

// Event clone input schema
const cloneEventInput = z.object({
  sourceEventId: z.number().positive(),
  eventDate: z.coerce.date(),
  clientId: z.number().positive().optional(),
  eventName: z.string().trim().min(1).max(255).optional(),
  location: z.string().max(500).optional(),
  estimatedAttendees: z.number().positive().optional(),
  notes: z.string().optional(),
  venueId: z.number().positive().optional(),
});

export const eventRouter = router({
  // FR-001: Create event (administrators only)
  create: adminProcedure.input(createEventInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    // Verify client exists
    const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Client not found',
      });
    }

    // If venueId provided, verify venue exists
    if (input.venueId) {
      const [venue] = await db.select().from(venues).where(eq(venues.id, input.venueId)).limit(1);

      if (!venue) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue not found',
        });
      }
    }

    // If templateId provided, verify template exists
    if (input.templateId) {
      const [template] = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.id, input.templateId))
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }
    }

    // Create event with optional templateId
    const [event] = await db
      .insert(events)
      .values({
        clientId: input.clientId,
        eventName: input.eventName,
        eventDate: input.eventDate,
        location: input.location,
        estimatedAttendees: input.estimatedAttendees,
        notes: input.notes,
        status: 'inquiry',
        createdBy: parseInt(session.user.id, 10),
        templateId: input.templateId ?? null,
        venueId: input.venueId ?? null,
      })
      .returning();

    // Log initial status
    await db.insert(eventStatusLog).values({
      eventId: event.id,
      oldStatus: null,
      newStatus: 'inquiry',
      changedBy: parseInt(session.user.id, 10),
      notes: 'Event created',
    });

    // Generate tasks from template if provided
    if (input.templateId) {
      const templateItems = await db
        .select()
        .from(taskTemplateItems)
        .where(eq(taskTemplateItems.templateId, input.templateId))
        .orderBy(asc(taskTemplateItems.sortOrder));

      // Map sortOrder -> created task ID for dependency resolution
      const taskIdMap = new Map<number, number>();

      for (const item of templateItems) {
        const dueDate = addDays(input.eventDate, item.daysOffset);
        const dependsOnTaskId = item.dependsOnIndex
          ? (taskIdMap.get(item.dependsOnIndex) ?? null)
          : null;

        const [createdTask] = await db
          .insert(tasks)
          .values({
            eventId: event.id,
            title: item.title,
            description: item.description,
            category: item.category,
            dueDate,
            dependsOnTaskId,
            status: 'pending',
          })
          .returning({ id: tasks.id });

        taskIdMap.set(item.sortOrder, createdTask.id);
      }
    }

    return event;
  }),

  // FR-004: List events with filters and pagination
  list: protectedProcedure.input(listEventsInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const { status, clientId, dateFrom, dateTo, query, limit, cursor } = input;

    // Build where conditions
    const conditions = [eq(events.isArchived, false)];

    if (status && status !== 'all') {
      conditions.push(eq(events.status, status));
    }

    if (clientId) {
      conditions.push(eq(events.clientId, clientId));
    }

    if (dateFrom) {
      conditions.push(gte(events.eventDate, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(events.eventDate, dateTo));
    }

    if (query) {
      const pattern = `%${query}%`;
      conditions.push(or(ilike(events.eventName, pattern), ilike(events.location, pattern))!);
    }

    if (cursor) {
      conditions.push(gte(events.id, cursor));
    }

    // Query events with client info and task counts
    const results = await db
      .select({
        id: events.id,
        eventName: events.eventName,
        clientName: clients.companyName,
        eventDate: events.eventDate,
        status: events.status,
        taskCount: sql<number>`COALESCE(COUNT(DISTINCT tasks.id), 0)`,
        completedTaskCount: sql<number>`COALESCE(COUNT(DISTINCT CASE WHEN tasks.status = 'completed' THEN tasks.id END), 0)`,
      })
      .from(events)
      .leftJoin(clients, eq(events.clientId, clients.id))
      .leftJoin(tasks, eq(tasks.eventId, events.id))
      .where(and(...conditions))
      .groupBy(events.id, clients.companyName)
      .orderBy(desc(events.eventDate))
      .limit(limit + 1);

    let nextCursor: number | null = null;
    if (results.length > limit) {
      const nextItem = results.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return {
      items: results,
      nextCursor,
    };
  }),

  // FR-005: Get event by ID with full details
  getById: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get event with client and venue info
      const [event] = await db
        .select({
          id: events.id,
          eventName: events.eventName,
          eventDate: events.eventDate,
          location: events.location,
          status: events.status,
          estimatedAttendees: events.estimatedAttendees,
          notes: events.notes,
          isArchived: events.isArchived,
          archivedAt: events.archivedAt,
          clonedFromEventId: events.clonedFromEventId,
          venueId: events.venueId,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          client: {
            id: clients.id,
            companyName: clients.companyName,
            contactName: clients.contactName,
            email: clients.email,
            phone: clients.phone,
          },
          venue: {
            id: venues.id,
            name: venues.name,
            address: venues.address,
            capacity: venues.capacity,
            hasKitchen: venues.hasKitchen,
            kitchenType: venues.kitchenType,
            equipmentAvailable: venues.equipmentAvailable,
            parkingNotes: venues.parkingNotes,
            loadInNotes: venues.loadInNotes,
          },
        })
        .from(events)
        .leftJoin(clients, eq(events.clientId, clients.id))
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(eq(events.id, input.id))
        .limit(1);

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      // Get status history
      const statusHistory = await db
        .select({
          id: eventStatusLog.id,
          oldStatus: eventStatusLog.oldStatus,
          newStatus: eventStatusLog.newStatus,
          changedAt: eventStatusLog.changedAt,
          changedBy: users.name,
          notes: eventStatusLog.notes,
        })
        .from(eventStatusLog)
        .leftJoin(users, eq(eventStatusLog.changedBy, users.id))
        .where(eq(eventStatusLog.eventId, input.id))
        .orderBy(desc(eventStatusLog.changedAt));

      // Get tasks (placeholder until tasks are implemented)
      const tasks: { id: number; title: string; status: string }[] = [];

      return {
        ...event,
        statusHistory,
        tasks,
      };
    }),

  // FR-002: Update event status
  updateStatus: adminProcedure.input(updateStatusInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    // Get current event
    const [currentEvent] = await db.select().from(events).where(eq(events.id, input.id)).limit(1);

    if (!currentEvent) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }

    if (currentEvent.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot update status of archived event',
      });
    }

    // Update event status in a transaction
    await db.transaction(async (tx) => {
      // Update event
      await tx
        .update(events)
        .set({
          status: input.newStatus,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.id));

      // Log status change
      await tx.insert(eventStatusLog).values({
        eventId: input.id,
        oldStatus: currentEvent.status,
        newStatus: input.newStatus,
        changedBy: parseInt(session.user.id, 10),
        notes: input.notes,
      });
    });

    // Notify all assigned users on this event
    const assignedUsers = await db
      .selectDistinct({ userId: tasks.assignedTo })
      .from(tasks)
      .where(and(eq(tasks.eventId, input.id), isNotNull(tasks.assignedTo)));

    const userIds = assignedUsers.map((u) => u.userId).filter((id): id is number => id !== null);

    if (userIds.length > 0) {
      await createNotifications(
        db,
        userIds.map((userId) => ({
          userId,
          type: 'status_changed' as const,
          title: `"${currentEvent.eventName}" status changed to ${input.newStatus}`,
          entityType: 'event',
          entityId: input.id,
        }))
      );
    }

    return { success: true };
  }),

  // FR-006: Update event details
  update: adminProcedure.input(updateEventInput).mutation(async ({ ctx, input }) => {
    const { db } = ctx;
    const { id, ...updates } = input;

    // Verify event exists
    const [existingEvent] = await db.select().from(events).where(eq(events.id, id)).limit(1);

    if (!existingEvent) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }

    if (existingEvent.isArchived) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot update archived event',
      });
    }

    // Update event
    const [updatedEvent] = await db
      .update(events)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();

    return updatedEvent;
  }),

  // Clone event with tasks
  clone: adminProcedure.input(cloneEventInput).mutation(async ({ ctx, input }) => {
    const { db, session } = ctx;

    // Verify source event exists
    const [sourceEvent] = await db
      .select()
      .from(events)
      .where(eq(events.id, input.sourceEventId))
      .limit(1);

    if (!sourceEvent) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Source event not found',
      });
    }

    // If clientId override provided, verify client exists
    const clientId = input.clientId ?? sourceEvent.clientId;
    if (input.clientId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }
    }

    // Clone within a transaction
    return await db.transaction(async (tx) => {
      // Create new event with overrides
      const [newEvent] = await tx
        .insert(events)
        .values({
          clientId,
          eventName: input.eventName ?? sourceEvent.eventName,
          eventDate: input.eventDate,
          location: input.location ?? sourceEvent.location,
          estimatedAttendees: input.estimatedAttendees ?? sourceEvent.estimatedAttendees,
          notes: input.notes ?? sourceEvent.notes,
          status: 'inquiry',
          createdBy: parseInt(session.user.id, 10),
          templateId: sourceEvent.templateId,
          venueId: input.venueId ?? sourceEvent.venueId,
          clonedFromEventId: sourceEvent.id,
        })
        .returning();

      // Log initial status
      await tx.insert(eventStatusLog).values({
        eventId: newEvent.id,
        oldStatus: null,
        newStatus: 'inquiry',
        changedBy: parseInt(session.user.id, 10),
        notes: `Cloned from event #${sourceEvent.id}`,
      });

      // Get source tasks ordered by ID for consistent remapping
      const sourceTasks = await tx
        .select()
        .from(tasks)
        .where(eq(tasks.eventId, sourceEvent.id))
        .orderBy(asc(tasks.id));

      // Build old task ID → new task ID map for dependency remapping
      const taskIdMap = new Map<number, number>();
      const sourceTaskIds = new Set(sourceTasks.map((t) => t.id));

      for (const sourceTask of sourceTasks) {
        // Recalculate due date relative to new event date
        let newDueDate: Date | null = null;
        if (sourceTask.dueDate) {
          const offsetMs = differenceInMilliseconds(sourceTask.dueDate, sourceEvent.eventDate);
          newDueDate = new Date(input.eventDate.getTime() + offsetMs);
        }

        const [newTask] = await tx
          .insert(tasks)
          .values({
            eventId: newEvent.id,
            title: sourceTask.title,
            description: sourceTask.description,
            category: sourceTask.category,
            status: 'pending',
            assignedTo: null,
            dueDate: newDueDate,
            dependsOnTaskId: null, // Will be remapped in second pass
            isOverdue: false,
          })
          .returning({ id: tasks.id });

        taskIdMap.set(sourceTask.id, newTask.id);
      }

      // Second pass: remap dependencies
      for (const sourceTask of sourceTasks) {
        if (sourceTask.dependsOnTaskId && sourceTaskIds.has(sourceTask.dependsOnTaskId)) {
          const newTaskId = taskIdMap.get(sourceTask.id)!;
          const newDependsOnId = taskIdMap.get(sourceTask.dependsOnTaskId)!;

          await tx
            .update(tasks)
            .set({ dependsOnTaskId: newDependsOnId })
            .where(eq(tasks.id, newTaskId));
        }
      }

      return newEvent;
    });
  }),

  // Bulk: Export events as CSV
  exportCsv: adminProcedure
    .input(
      z.object({
        status: eventStatusEnum.optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      const conditions = [eq(events.isArchived, false)];
      if (input.status) {
        conditions.push(eq(events.status, input.status));
      }
      if (input.dateFrom) {
        conditions.push(gte(events.eventDate, input.dateFrom));
      }
      if (input.dateTo) {
        conditions.push(lte(events.eventDate, input.dateTo));
      }

      const results = await db
        .select({
          id: events.id,
          eventName: events.eventName,
          clientName: clients.companyName,
          eventDate: events.eventDate,
          location: events.location,
          status: events.status,
          estimatedAttendees: events.estimatedAttendees,
          notes: events.notes,
          createdAt: events.createdAt,
        })
        .from(events)
        .leftJoin(clients, eq(events.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(events.eventDate));

      const headers = [
        'ID',
        'Event Name',
        'Client Name',
        'Event Date',
        'Location',
        'Status',
        'Estimated Attendees',
        'Notes',
        'Created At',
      ];

      const rows = results.map((r) => [
        r.id,
        r.eventName,
        r.clientName,
        r.eventDate,
        r.location,
        r.status,
        r.estimatedAttendees,
        r.notes,
        r.createdAt,
      ]);

      const csv = generateCSV(headers, rows);
      const date = new Date().toISOString().split('T')[0];
      return { csv, filename: `events-${date}.csv`, rowCount: rows.length };
    }),

  // Bulk: Import events from CSV
  importCsv: adminProcedure
    .input(z.object({ csvData: z.string().max(1_500_000) }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const { headers, rows } = parseCSV(input.csvData);
      if (rows.length === 0) {
        return { imported: 0, errors: [] as ImportError[], total: 0 };
      }

      const requiredFields = ['eventName', 'clientName', 'eventDate'];
      const optionalFields = ['location', 'estimatedAttendees', 'notes'];
      const { mapping, errors: headerErrors } = buildFieldMapping(
        headers,
        requiredFields,
        optionalFields
      );

      if (!mapping) {
        return {
          imported: 0,
          errors: headerErrors.map((msg) => ({ row: 0, field: 'header', message: msg })),
          total: rows.length,
        };
      }

      // Row validation schema — inputs come as strings from CSV
      const eventImportSchema = z.object({
        eventName: z.string().min(1, 'Event name is required'),
        clientName: z.string().min(1, 'Client name is required'),
        eventDate: z.string().min(1, 'Event date is required'),
        location: z.string().optional(),
        estimatedAttendees: z.string().optional(),
        notes: z.string().optional(),
      });

      const { valid, errors: validationErrors } = validateImportRows(
        rows,
        eventImportSchema,
        mapping
      );

      // Resolve client names to IDs (batch lookup)
      const clientNames = [...new Set(valid.map((v) => v.data.clientName))];
      const allErrors: ImportError[] = [...validationErrors];

      const clientLookup = new Map<string, number>();
      if (clientNames.length > 0) {
        const foundClients = await db
          .select({ id: clients.id, companyName: clients.companyName })
          .from(clients);

        for (const c of foundClients) {
          clientLookup.set(c.companyName.toLowerCase(), c.id);
        }
      }

      // Filter valid rows by client resolution
      const insertReady: {
        eventName: string;
        clientId: number;
        eventDate: Date;
        location?: string;
        estimatedAttendees?: number;
        notes?: string;
        rowIndex: number;
      }[] = [];

      for (const { data, rowIndex } of valid) {
        const clientId = clientLookup.get(data.clientName.toLowerCase());
        if (!clientId) {
          allErrors.push({
            row: rowIndex,
            field: 'clientName',
            message: `Client "${data.clientName}" not found`,
          });
          continue;
        }

        const eventDate = new Date(data.eventDate);
        if (Number.isNaN(eventDate.getTime())) {
          allErrors.push({
            row: rowIndex,
            field: 'eventDate',
            message: 'Invalid date format',
          });
          continue;
        }

        const attendees = data.estimatedAttendees
          ? parseInt(data.estimatedAttendees, 10)
          : undefined;
        if (data.estimatedAttendees && (Number.isNaN(attendees) || (attendees && attendees < 1))) {
          allErrors.push({
            row: rowIndex,
            field: 'estimatedAttendees',
            message: 'Must be a positive number',
          });
          continue;
        }

        insertReady.push({
          eventName: data.eventName,
          clientId,
          eventDate,
          location: data.location || undefined,
          estimatedAttendees: attendees,
          notes: data.notes || undefined,
          rowIndex,
        });
      }

      if (insertReady.length === 0) {
        return { imported: 0, errors: allErrors, total: rows.length };
      }

      // Insert all valid rows in a transaction
      const userId = parseInt(session.user.id, 10);
      let imported = 0;

      await db.transaction(async (tx) => {
        for (const row of insertReady) {
          const [event] = await tx
            .insert(events)
            .values({
              clientId: row.clientId,
              eventName: row.eventName,
              eventDate: row.eventDate,
              location: row.location,
              estimatedAttendees: row.estimatedAttendees,
              notes: row.notes,
              status: 'inquiry',
              createdBy: userId,
            })
            .returning({ id: events.id });

          await tx.insert(eventStatusLog).values({
            eventId: event.id,
            oldStatus: null,
            newStatus: 'inquiry',
            changedBy: userId,
            notes: 'Imported from CSV',
          });

          imported++;
        }
      });

      return { imported, errors: allErrors, total: rows.length };
    }),

  // Bulk: Batch update status for multiple events
  batchUpdateStatus: adminProcedure
    .input(
      z.object({
        ids: z.array(z.number().positive()).min(1).max(100),
        newStatus: eventStatusEnum,
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const userId = parseInt(session.user.id, 10);

      // Fetch all target events
      const targetEvents = await db
        .select({
          id: events.id,
          status: events.status,
          isArchived: events.isArchived,
          eventName: events.eventName,
        })
        .from(events)
        .where(inArray(events.id, input.ids));

      // Validate: all IDs must exist
      if (targetEvents.length !== input.ids.length) {
        const foundIds = new Set(targetEvents.map((e) => e.id));
        const missing = input.ids.filter((id) => !foundIds.has(id));
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Events not found: ${missing.join(', ')}`,
        });
      }

      // Validate: none archived
      const archived = targetEvents.filter((e) => e.isArchived);
      if (archived.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot update archived events: ${archived.map((e) => e.id).join(', ')}`,
        });
      }

      // All-or-nothing transaction
      await db.transaction(async (tx) => {
        for (const event of targetEvents) {
          await tx
            .update(events)
            .set({ status: input.newStatus, updatedAt: new Date() })
            .where(eq(events.id, event.id));

          await tx.insert(eventStatusLog).values({
            eventId: event.id,
            oldStatus: event.status,
            newStatus: input.newStatus,
            changedBy: userId,
            notes: input.notes ?? 'Batch status update',
          });
        }
      });

      // Notify assigned users (batched)
      const assignedUsers = await db
        .selectDistinct({ userId: tasks.assignedTo, eventId: tasks.eventId })
        .from(tasks)
        .where(and(inArray(tasks.eventId, input.ids), isNotNull(tasks.assignedTo)));

      const notifications = assignedUsers
        .filter((u): u is typeof u & { userId: number } => u.userId !== null)
        .map((u) => {
          const event = targetEvents.find((e) => e.id === u.eventId);
          return {
            userId: u.userId,
            type: 'status_changed' as const,
            title: `"${event?.eventName}" status changed to ${input.newStatus}`,
            entityType: 'event',
            entityId: u.eventId,
          };
        });

      if (notifications.length > 0) {
        await createNotifications(db, notifications);
      }

      return { updated: targetEvents.length };
    }),

  // FR-007: Archive event
  archive: adminProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get event
      const [event] = await db.select().from(events).where(eq(events.id, input.id)).limit(1);

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.isArchived) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Event is already archived',
        });
      }

      // Only allow archiving completed events
      if (event.status !== 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only completed events can be archived',
        });
      }

      // Archive event
      await db
        .update(events)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: parseInt(session.user.id, 10),
        })
        .where(eq(events.id, input.id));

      return { success: true };
    }),
});
