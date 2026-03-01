import { clients, events, resources, tasks } from '@catering-event-manager/database/schema';
import { and, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

const globalSearchInput = z.object({
  query: z.string().min(2).max(100),
});

export const searchRouter = router({
  global: protectedProcedure.input(globalSearchInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const pattern = `%${input.query}%`;

    const [eventResults, clientResults, taskResults, resourceResults] = await Promise.all([
      // Events: search event_name and location, exclude archived
      db
        .select({
          id: events.id,
          eventName: events.eventName,
          location: events.location,
          status: events.status,
          eventDate: events.eventDate,
        })
        .from(events)
        .where(
          and(
            eq(events.isArchived, false),
            or(ilike(events.eventName, pattern), ilike(events.location, pattern))
          )
        )
        .limit(5),

      // Clients: search company_name, contact_name, email
      db
        .select({
          id: clients.id,
          companyName: clients.companyName,
          contactName: clients.contactName,
          email: clients.email,
        })
        .from(clients)
        .where(
          or(
            ilike(clients.companyName, pattern),
            ilike(clients.contactName, pattern),
            ilike(clients.email, pattern)
          )
        )
        .limit(5),

      // Tasks: search title
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          eventId: tasks.eventId,
          category: tasks.category,
        })
        .from(tasks)
        .where(ilike(tasks.title, pattern))
        .limit(5),

      // Resources: search name
      db
        .select({
          id: resources.id,
          name: resources.name,
          type: resources.type,
          isAvailable: resources.isAvailable,
        })
        .from(resources)
        .where(ilike(resources.name, pattern))
        .limit(5),
    ]);

    return {
      events: eventResults,
      clients: clientResults,
      tasks: taskResults,
      resources: resourceResults,
    };
  }),
});
