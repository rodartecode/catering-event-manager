import {
  eventStatusEnum,
  events,
  expenses,
  invoices,
  resourceSchedule,
  resources,
  taskCategoryEnum,
  tasks,
} from '@catering-event-manager/database/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

// Input schemas
const dateRangeInput = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

const resourceUtilizationInput = dateRangeInput.extend({
  resourceType: z.enum(['staff', 'equipment', 'materials', 'all']).optional().default('all'),
});

const taskPerformanceInput = dateRangeInput.extend({
  category: z.enum(['pre_event', 'during_event', 'post_event', 'all']).optional().default('all'),
});

// Types for query results
type EventRow = {
  id: number;
  status: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up';
  createdAt: Date;
  updatedAt: Date;
};

type ResourceRow = {
  id: number;
  name: string;
  type: 'staff' | 'equipment' | 'materials';
};

type ScheduleEntry = {
  resourceId?: number;
  startTime: Date;
  endTime: Date;
};

type TaskRow = {
  id: number;
  category: 'pre_event' | 'during_event' | 'post_event';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  isOverdue: boolean;
};

export const analyticsRouter = router({
  // FR-024: Event completion report
  eventCompletion: protectedProcedure.input(dateRangeInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const { dateFrom, dateTo } = input;

    // Get all events in date range (not archived)
    const eventsInRange: EventRow[] = await db
      .select({
        id: events.id,
        status: events.status,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .where(
        and(
          eq(events.isArchived, false),
          gte(events.createdAt, dateFrom),
          lte(events.createdAt, dateTo)
        )
      );

    const totalEvents = eventsInRange.length;
    const completedEvents = eventsInRange.filter(
      (e: EventRow) => e.status === 'completed' || e.status === 'follow_up'
    ).length;

    // Calculate completion rate
    const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;

    // Calculate average days to complete for completed events
    const completedWithTimes = eventsInRange.filter(
      (e: EventRow) =>
        (e.status === 'completed' || e.status === 'follow_up') && e.createdAt && e.updatedAt
    );

    let averageDaysToComplete = 0;
    if (completedWithTimes.length > 0) {
      const totalDays = completedWithTimes.reduce((acc: number, e: EventRow) => {
        const created = new Date(e.createdAt).getTime();
        const updated = new Date(e.updatedAt).getTime();
        const days = (updated - created) / (1000 * 60 * 60 * 24);
        return acc + days;
      }, 0);
      averageDaysToComplete = totalDays / completedWithTimes.length;
    }

    // Get breakdown by status
    const statusCounts = eventStatusEnum.enumValues.map((status: string) => ({
      status,
      count: eventsInRange.filter((e: EventRow) => e.status === status).length,
    }));

    return {
      totalEvents,
      completedEvents,
      completionRate: Math.round(completionRate * 100) / 100,
      averageDaysToComplete: Math.round(averageDaysToComplete * 100) / 100,
      byStatus: statusCounts,
    };
  }),

  // FR-025: Resource utilization analytics
  resourceUtilization: protectedProcedure
    .input(resourceUtilizationInput)
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const { dateFrom, dateTo, resourceType } = input;

      // Get resources filtered by type
      const resourcesQuery = db
        .select({
          id: resources.id,
          name: resources.name,
          type: resources.type,
        })
        .from(resources);

      const allResources: ResourceRow[] =
        resourceType === 'all'
          ? await resourcesQuery
          : await resourcesQuery.where(eq(resources.type, resourceType));

      // Calculate available hours in date range (assuming 8 hours per business day)
      const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
      // Rough estimate: ~71% of days are business days (5/7)
      const businessDays = Math.max(1, Math.round(daysDiff * 0.71));
      const availableHours = businessDays * 8;

      // Get utilization data in a single JOIN query (replaces N+1 per-resource queries)
      const resourceIds = allResources.map((r: ResourceRow) => r.id);

      // Batch fetch all schedule entries for matching resources in one query
      const scheduleByResource = new Map<number, ScheduleEntry[]>();
      if (resourceIds.length > 0) {
        const allEntries = await db
          .select({
            resourceId: resourceSchedule.resourceId,
            startTime: resourceSchedule.startTime,
            endTime: resourceSchedule.endTime,
          })
          .from(resourceSchedule)
          .where(
            and(
              sql`${resourceSchedule.resourceId} IN ${resourceIds}`,
              lte(resourceSchedule.startTime, dateTo),
              gte(resourceSchedule.endTime, dateFrom)
            )
          );

        for (const entry of allEntries) {
          const existing = scheduleByResource.get(entry.resourceId);
          if (existing) {
            existing.push(entry);
          } else {
            scheduleByResource.set(entry.resourceId, [entry]);
          }
        }
      }

      const utilizationData = allResources.map((resource: ResourceRow) => {
        const scheduleEntries = scheduleByResource.get(resource.id) ?? [];

        const totalHoursAllocated = scheduleEntries.reduce((acc: number, entry: ScheduleEntry) => {
          const start = new Date(Math.max(entry.startTime.getTime(), dateFrom.getTime()));
          const end = new Date(Math.min(entry.endTime.getTime(), dateTo.getTime()));
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return acc + Math.max(0, hours);
        }, 0);

        const assignedTasks = scheduleEntries.length;
        const utilizationPercentage =
          availableHours > 0 ? (totalHoursAllocated / availableHours) * 100 : 0;

        return {
          resourceId: resource.id,
          resourceName: resource.name,
          resourceType: resource.type,
          assignedTasks,
          totalHoursAllocated: Math.round(totalHoursAllocated * 100) / 100,
          utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
        };
      });

      // Sort by utilization percentage descending
      type UtilizationItem = { utilizationPercentage: number };
      return utilizationData.sort(
        (a: UtilizationItem, b: UtilizationItem) =>
          b.utilizationPercentage - a.utilizationPercentage
      );
    }),

  // FR-027: Task performance analytics
  taskPerformance: protectedProcedure.input(taskPerformanceInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const { dateFrom, dateTo, category } = input;

    // Get tasks in date range
    const dateConditions = and(gte(tasks.createdAt, dateFrom), lte(tasks.createdAt, dateTo));
    const whereConditions =
      category === 'all' ? dateConditions : and(dateConditions, eq(tasks.category, category));

    const allTasks: TaskRow[] = await db
      .select({
        id: tasks.id,
        category: tasks.category,
        status: tasks.status,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        completedAt: tasks.completedAt,
        isOverdue: tasks.isOverdue,
      })
      .from(tasks)
      .where(whereConditions);

    // Group by category
    const categories: string[] = category === 'all' ? taskCategoryEnum.enumValues : [category];

    const performanceData = categories.map((cat: string) => {
      const categoryTasks = allTasks.filter((t: TaskRow) => t.category === cat);
      const totalTasks = categoryTasks.length;
      const completedTasks = categoryTasks.filter((t: TaskRow) => t.status === 'completed').length;

      // Calculate average completion time for completed tasks
      const completedWithTimes = categoryTasks.filter(
        (t: TaskRow) => t.status === 'completed' && t.createdAt && t.completedAt
      );

      let averageCompletionTime = 0;
      if (completedWithTimes.length > 0) {
        const totalHours = completedWithTimes.reduce((acc: number, t: TaskRow) => {
          if (!t.completedAt) return acc;
          const created = new Date(t.createdAt).getTime();
          const completed = new Date(t.completedAt).getTime();
          const hours = (completed - created) / (1000 * 60 * 60);
          return acc + hours;
        }, 0);
        averageCompletionTime = totalHours / completedWithTimes.length;
      }

      // Count overdue tasks
      const now = new Date();
      const overdueCount = categoryTasks.filter((t: TaskRow) => {
        if (t.status === 'completed') {
          // Was overdue if completed after due date
          return t.dueDate && t.completedAt && t.completedAt > t.dueDate;
        }
        // Is overdue if due date passed and not completed
        return t.dueDate && t.dueDate < now;
      }).length;

      return {
        category: cat as 'pre_event' | 'during_event' | 'post_event',
        totalTasks,
        completedTasks,
        averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
        overdueCount,
      };
    });

    return performanceData;
  }),

  // Financial summary analytics
  financialSummary: protectedProcedure.input(dateRangeInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const { dateFrom, dateTo } = input;

    // Get invoices in date range
    const invoiceList = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        total: invoices.total,
      })
      .from(invoices)
      .where(and(gte(invoices.createdAt, dateFrom), lte(invoices.createdAt, dateTo)));

    // Calculate totals by status
    let totalRevenue = 0;
    let outstanding = 0;
    const statusCounts: Record<string, number> = {};

    for (const inv of invoiceList) {
      const total = parseFloat(inv.total ?? '0');
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;

      if (inv.status === 'paid') {
        totalRevenue += total;
      } else if (inv.status === 'sent' || inv.status === 'overdue') {
        outstanding += total;
      }
    }

    // Get total expenses in date range
    const expenseList = await db
      .select({ amount: expenses.amount })
      .from(expenses)
      .where(and(gte(expenses.createdAt, dateFrom), lte(expenses.createdAt, dateTo)));

    let totalExpenses = 0;
    for (const exp of expenseList) {
      totalExpenses += parseFloat(exp.amount ?? '0');
    }

    const profitMargin =
      totalRevenue > 0
        ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 10000) / 100
        : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      profitMargin,
      invoicesByStatus: statusCounts,
      invoiceCount: invoiceList.length,
    };
  }),

  // Per-event profitability
  eventProfitability: protectedProcedure.input(dateRangeInput).query(async ({ ctx, input }) => {
    const { db } = ctx;
    const { dateFrom, dateTo } = input;

    // Get events in date range
    const eventList = await db
      .select({
        id: events.id,
        eventName: events.eventName,
        eventDate: events.eventDate,
        status: events.status,
      })
      .from(events)
      .where(
        and(
          eq(events.isArchived, false),
          gte(events.createdAt, dateFrom),
          lte(events.createdAt, dateTo)
        )
      );

    // Batch fetch invoice and expense totals (replaces 2N queries with 2 queries)
    const eventIds = eventList.map((e) => e.id);

    const invoiceTotalsByEvent = new Map<number, { quoted: number; paid: number }>();
    const expenseTotalsByEvent = new Map<number, number>();

    if (eventIds.length > 0) {
      const invoiceAggs = await db
        .select({
          eventId: invoices.eventId,
          quotedTotal: sql<string>`COALESCE(SUM(${invoices.total}), 0)`,
          paidTotal: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END), 0)`,
        })
        .from(invoices)
        .where(sql`${invoices.eventId} IN ${eventIds}`)
        .groupBy(invoices.eventId);

      for (const row of invoiceAggs) {
        invoiceTotalsByEvent.set(row.eventId, {
          quoted: parseFloat(row.quotedTotal ?? '0'),
          paid: parseFloat(row.paidTotal ?? '0'),
        });
      }

      const expenseAggs = await db
        .select({
          eventId: expenses.eventId,
          total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(sql`${expenses.eventId} IN ${eventIds}`)
        .groupBy(expenses.eventId);

      for (const row of expenseAggs) {
        expenseTotalsByEvent.set(row.eventId, parseFloat(row.total ?? '0'));
      }
    }

    const profitabilityData = eventList.map((event) => {
      const inv = invoiceTotalsByEvent.get(event.id) ?? { quoted: 0, paid: 0 };
      const actualCost = expenseTotalsByEvent.get(event.id) ?? 0;
      const profit = Math.round((inv.paid - actualCost) * 100) / 100;
      const margin = inv.paid > 0 ? Math.round((profit / inv.paid) * 10000) / 100 : 0;

      return {
        eventId: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        status: event.status,
        quotedTotal: Math.round(inv.quoted * 100) / 100,
        paidTotal: Math.round(inv.paid * 100) / 100,
        actualCost: Math.round(actualCost * 100) / 100,
        profit,
        margin,
      };
    });

    // Sort by profit descending
    return profitabilityData.sort((a, b) => b.profit - a.profit);
  }),
});
