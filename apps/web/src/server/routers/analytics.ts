import {
  events,
  eventStatusEnum,
  resourceSchedule,
  resources,
  taskCategoryEnum,
  tasks,
} from '@catering-event-manager/database/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
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

      // Get schedule entries for each resource in date range
      const utilizationData = await Promise.all(
        allResources.map(async (resource: ResourceRow) => {
          // Get all schedule entries for this resource that overlap with date range
          const scheduleEntries: ScheduleEntry[] = await db
            .select({
              startTime: resourceSchedule.startTime,
              endTime: resourceSchedule.endTime,
            })
            .from(resourceSchedule)
            .where(
              and(
                eq(resourceSchedule.resourceId, resource.id),
                lte(resourceSchedule.startTime, dateTo),
                gte(resourceSchedule.endTime, dateFrom)
              )
            );

          // Calculate total hours allocated
          const totalHoursAllocated = scheduleEntries.reduce(
            (acc: number, entry: ScheduleEntry) => {
              const start = new Date(Math.max(entry.startTime.getTime(), dateFrom.getTime()));
              const end = new Date(Math.min(entry.endTime.getTime(), dateTo.getTime()));
              const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              return acc + Math.max(0, hours);
            },
            0
          );

          // Count assigned tasks
          const assignedTasks = scheduleEntries.length;

          // Calculate utilization percentage
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
        })
      );

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
      category === 'all'
        ? dateConditions
        : and(dateConditions, eq(tasks.category, category));

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
});
