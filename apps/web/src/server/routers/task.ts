import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { tasks, events, users, resources, taskResources, resourceSchedule } from '@catering-event-manager/database/schema';
import { eq, and, desc, sql, ne, isNull, or, lt, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '@/lib/logger';

import { schedulingClient, SchedulingClientError } from '../services/scheduling-client';

// Task status enum for validation
const taskStatusEnum = z.enum(['pending', 'in_progress', 'completed']);

// Task category enum for validation
const taskCategoryEnum = z.enum(['pre_event', 'during_event', 'post_event']);

// Task create input schema
const createTaskInput = z.object({
  eventId: z.number().positive(),
  title: z.string().trim().min(1).max(255),
  description: z.string().optional(),
  category: taskCategoryEnum,
  dueDate: z.coerce.date().optional(),
  dependsOnTaskId: z.number().positive().optional(),
});

// Task list input schema
const listTasksInput = z.object({
  eventId: z.number().positive(),
  status: z.enum(['pending', 'in_progress', 'completed', 'all']).optional(),
  category: z.enum(['pre_event', 'during_event', 'post_event', 'all']).optional(),
  overdueOnly: z.boolean().optional(),
  assignedToMe: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().optional(),
});

// Task update input schema
const updateTaskInput = z.object({
  id: z.number().positive(),
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().optional(),
  category: taskCategoryEnum.optional(),
  dueDate: z.coerce.date().optional().nullable(),
  dependsOnTaskId: z.number().positive().optional().nullable(),
});

// Task assign input schema
const assignTaskInput = z.object({
  taskId: z.number().positive(),
  userId: z.number().positive().nullable(),
});

// Task status update input schema
const updateStatusInput = z.object({
  id: z.number().positive(),
  newStatus: taskStatusEnum,
});

/**
 * Detects circular dependencies in task dependency chain.
 * Returns true if adding dependsOnTaskId would create a cycle.
 */
async function detectCircularDependency(
  db: any,
  taskId: number,
  dependsOnTaskId: number,
  eventId: number
): Promise<boolean> {
  // Get all tasks for this event to build dependency graph
  const eventTasks = await db
    .select({
      id: tasks.id,
      dependsOnTaskId: tasks.dependsOnTaskId,
    })
    .from(tasks)
    .where(eq(tasks.eventId, eventId));

  // Build adjacency list
  const dependencyMap = new Map<number, number | null>();
  for (const task of eventTasks) {
    dependencyMap.set(task.id, task.dependsOnTaskId);
  }

  // Add the proposed dependency
  dependencyMap.set(taskId, dependsOnTaskId);

  // Check for cycle starting from taskId
  const visited = new Set<number>();
  let current: number | null = taskId;

  while (current !== null) {
    if (visited.has(current)) {
      return true; // Cycle detected
    }
    visited.add(current);
    current = dependencyMap.get(current) ?? null;
  }

  return false;
}

/**
 * Checks if all dependencies of a task are completed.
 * Returns the blocking task if dependency is not complete, null otherwise.
 */
async function checkDependencyCompletion(
  db: any,
  taskId: number
): Promise<{ id: number; title: string; status: string } | null> {
  const [task] = await db
    .select({
      dependsOnTaskId: tasks.dependsOnTaskId,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task || !task.dependsOnTaskId) {
    return null;
  }

  const [dependentTask] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
    })
    .from(tasks)
    .where(eq(tasks.id, task.dependsOnTaskId))
    .limit(1);

  if (dependentTask && dependentTask.status !== 'completed') {
    return dependentTask;
  }

  return null;
}

export const taskRouter = router({
  // FR-008: Create task (administrators only)
  create: adminProcedure
    .input(createTaskInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify event exists and is not archived
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.isArchived) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot add tasks to archived event',
        });
      }

      // Validate dependency if provided
      if (input.dependsOnTaskId) {
        const [dependentTask] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.dependsOnTaskId))
          .limit(1);

        if (!dependentTask) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Dependent task not found',
          });
        }

        if (dependentTask.eventId !== input.eventId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Dependent task must belong to the same event',
          });
        }
      }

      // Create task
      const [task] = await db
        .insert(tasks)
        .values({
          eventId: input.eventId,
          title: input.title,
          description: input.description,
          category: input.category,
          dueDate: input.dueDate,
          dependsOnTaskId: input.dependsOnTaskId,
        })
        .returning();

      return task;
    }),

  // FR-009: Assign task to team member (administrators only)
  assign: adminProcedure
    .input(assignTaskInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify task exists
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId))
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Verify user exists if assigning
      if (input.userId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        if (!user.isActive) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot assign task to inactive user',
          });
        }
      }

      // Update task assignment
      const [updatedTask] = await db
        .update(tasks)
        .set({
          assignedTo: input.userId,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updatedTask;
    }),

  // FR-016: Assign multiple resources to a task with conflict checking
  assignResources: adminProcedure
    .input(z.object({
      taskId: z.number().positive(),
      resourceIds: z.array(z.number().positive()),
      startTime: z.coerce.date(),
      endTime: z.coerce.date(),
      force: z.boolean().optional().default(false), // Allow assignment despite conflicts
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { taskId, resourceIds, startTime, endTime, force } = input;

      // Validate time range
      if (endTime <= startTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'End time must be after start time',
        });
      }

      // Get task with event info
      const [task] = await db
        .select({
          id: tasks.id,
          eventId: tasks.eventId,
          title: tasks.title,
          event: {
            id: events.id,
            eventName: events.eventName,
            isArchived: events.isArchived,
          },
        })
        .from(tasks)
        .leftJoin(events, eq(tasks.eventId, events.id))
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      if (task.event?.isArchived) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot assign resources to tasks in archived events',
        });
      }

      // Verify all resources exist and are available
      const foundResources = await db
        .select()
        .from(resources)
        .where(inArray(resources.id, resourceIds));

      if (foundResources.length !== resourceIds.length) {
        const foundIds = new Set(foundResources.map((r: { id: number }) => r.id));
        const missingIds = resourceIds.filter((id: number) => !foundIds.has(id));
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Resources not found: ${missingIds.join(', ')}`,
        });
      }

      const unavailable = foundResources.filter((r: { isAvailable: boolean }) => !r.isAvailable);
      if (unavailable.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Resources not available: ${unavailable.map((r: { name: string }) => r.name).join(', ')}`,
        });
      }

      // Check for conflicts using Go service
      let conflicts: { resourceId: number; resourceName: string; message: string }[] = [];
      let serviceUnavailable = false;

      try {
        const conflictResult = await schedulingClient.checkConflicts({
          resource_ids: resourceIds,
          start_time: startTime,
          end_time: endTime,
        });

        if (conflictResult.has_conflicts) {
          conflicts = conflictResult.conflicts.map(c => ({
            resourceId: c.resource_id,
            resourceName: c.resource_name,
            message: c.message,
          }));
        }
      } catch (error) {
        logger.error('Resource conflict check failed', error instanceof Error ? error : new Error(String(error)), {
          context: 'assignResources',
          taskId,
          resourceIds: resourceIds.slice(0, 5),
          timeRange: { start: startTime.toISOString(), end: endTime.toISOString() },
          code: error instanceof SchedulingClientError ? error.code : undefined,
        });

        if (error instanceof SchedulingClientError) {
          if (error.code === 'TIMEOUT' || error.code === 'CONNECTION_ERROR') {
            serviceUnavailable = true;
          }
        }
        // Continue with assignment if service unavailable and force=true
        if (!force && !serviceUnavailable) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to check resource conflicts',
          });
        }
      }

      // If conflicts exist and not forcing, return conflicts for user decision
      if (conflicts.length > 0 && !force) {
        return {
          success: false,
          conflicts,
          message: 'Resource scheduling conflicts detected',
        };
      }

      // Remove existing resource assignments for this task
      await db.delete(taskResources).where(eq(taskResources.taskId, taskId));

      // Remove existing schedule entries for this task
      await db.delete(resourceSchedule).where(eq(resourceSchedule.taskId, taskId));

      // Create new task-resource assignments and schedule entries
      for (const resourceId of resourceIds) {
        // Create task-resource join entry
        await db.insert(taskResources).values({
          taskId,
          resourceId,
        });

        // Create schedule entry
        await db.insert(resourceSchedule).values({
          resourceId,
          eventId: task.eventId,
          taskId,
          startTime,
          endTime,
          notes: `Assigned to task: ${task.title}`,
        });
      }

      return {
        success: true,
        assignedResources: resourceIds.length,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        warning: serviceUnavailable ? 'Conflicts could not be verified - scheduling service unavailable' : undefined,
        forceOverride: conflicts.length > 0 && force,
      };
    }),

  // Get resources assigned to a task
  getAssignedResources: protectedProcedure
    .input(z.object({ taskId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const assigned = await db
        .select({
          resourceId: taskResources.resourceId,
          assignedAt: taskResources.assignedAt,
          resource: {
            id: resources.id,
            name: resources.name,
            type: resources.type,
            isAvailable: resources.isAvailable,
          },
          schedule: {
            startTime: resourceSchedule.startTime,
            endTime: resourceSchedule.endTime,
          },
        })
        .from(taskResources)
        .innerJoin(resources, eq(taskResources.resourceId, resources.id))
        .leftJoin(
          resourceSchedule,
          and(
            eq(resourceSchedule.taskId, input.taskId),
            eq(resourceSchedule.resourceId, taskResources.resourceId)
          )
        )
        .where(eq(taskResources.taskId, input.taskId));

      return assigned;
    }),

  // FR-010, FR-014: Update task status with dependency check
  updateStatus: protectedProcedure
    .input(updateStatusInput)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Get task
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.id))
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check if user is admin or assigned to this task
      const userRole = (session.user as { role?: string }).role;
      const isAdmin = userRole === 'administrator';
      const isAssigned = task.assignedTo === parseInt(session.user.id, 10);

      if (!isAdmin && !isAssigned) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update status of tasks assigned to you',
        });
      }

      // FR-014: Check dependency completion before allowing progress
      if (input.newStatus !== 'pending') {
        const blockingTask = await checkDependencyCompletion(db, input.id);
        if (blockingTask) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot progress task: dependency "${blockingTask.title}" is not completed yet`,
          });
        }
      }

      // Update task status
      const updateData: any = {
        status: input.newStatus,
        updatedAt: new Date(),
      };

      // Set completedAt if completing, clear if reverting
      if (input.newStatus === 'completed') {
        updateData.completedAt = new Date();
        updateData.isOverdue = false; // Clear overdue flag on completion
      } else if (task.status === 'completed') {
        updateData.completedAt = null;
      }

      const [updatedTask] = await db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, input.id))
        .returning();

      return updatedTask;
    }),

  // FR-011: List tasks for event with filters
  listByEvent: protectedProcedure
    .input(listTasksInput)
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { eventId, status, category, overdueOnly, assignedToMe, limit, cursor } = input;

      // Build where conditions
      const conditions = [eq(tasks.eventId, eventId)];

      if (status && status !== 'all') {
        conditions.push(eq(tasks.status, status));
      }

      if (category && category !== 'all') {
        conditions.push(eq(tasks.category, category));
      }

      if (overdueOnly) {
        conditions.push(eq(tasks.isOverdue, true));
      }

      if (assignedToMe) {
        conditions.push(eq(tasks.assignedTo, parseInt(session.user.id, 10)));
      }

      if (cursor) {
        conditions.push(sql`${tasks.id} >= ${cursor}`);
      }

      // Query tasks with assignee info
      const results = await db
        .select({
          id: tasks.id,
          eventId: tasks.eventId,
          title: tasks.title,
          description: tasks.description,
          category: tasks.category,
          status: tasks.status,
          dueDate: tasks.dueDate,
          dependsOnTaskId: tasks.dependsOnTaskId,
          isOverdue: tasks.isOverdue,
          completedAt: tasks.completedAt,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          assignedTo: tasks.assignedTo,
          assignee: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assignedTo, users.id))
        .where(and(...conditions))
        .orderBy(tasks.dueDate, tasks.createdAt)
        .limit(limit + 1);

      let nextCursor: number | null = null;
      if (results.length > limit) {
        const nextItem = results.pop();
        nextCursor = nextItem!.id;
      }

      // Transform results to handle null assignees
      const items = results.map((r: typeof results[number]) => ({
        ...r,
        assignee: r.assignee?.id ? r.assignee : null,
      }));

      return {
        items,
        nextCursor,
      };
    }),

  // FR-011: Get task by ID with details
  getById: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      // Get task with assignee info
      const [task] = await db
        .select({
          id: tasks.id,
          eventId: tasks.eventId,
          title: tasks.title,
          description: tasks.description,
          category: tasks.category,
          status: tasks.status,
          dueDate: tasks.dueDate,
          dependsOnTaskId: tasks.dependsOnTaskId,
          isOverdue: tasks.isOverdue,
          completedAt: tasks.completedAt,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          assignedTo: tasks.assignedTo,
          assignee: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assignedTo, users.id))
        .where(eq(tasks.id, input.id))
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Get dependency info if exists
      let dependency = null;
      if (task.dependsOnTaskId) {
        const [depTask] = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
          })
          .from(tasks)
          .where(eq(tasks.id, task.dependsOnTaskId))
          .limit(1);
        dependency = depTask || null;
      }

      // Get tasks that depend on this task
      const dependentTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
        })
        .from(tasks)
        .where(eq(tasks.dependsOnTaskId, input.id));

      return {
        ...task,
        assignee: task.assignee?.id ? task.assignee : null,
        dependency,
        dependentTasks,
      };
    }),

  // FR-012: Update task details (administrators only)
  update: adminProcedure
    .input(updateTaskInput)
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { id, ...updates } = input;

      // Verify task exists
      const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

      if (!existingTask) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check event is not archived
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, existingTask.eventId))
        .limit(1);

      if (event?.isArchived) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot update tasks in archived event',
        });
      }

      // Validate dependency if being updated
      if (updates.dependsOnTaskId !== undefined && updates.dependsOnTaskId !== null) {
        // Cannot depend on self
        if (updates.dependsOnTaskId === id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Task cannot depend on itself',
          });
        }

        // Verify dependent task exists and belongs to same event
        const [dependentTask] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, updates.dependsOnTaskId))
          .limit(1);

        if (!dependentTask) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Dependent task not found',
          });
        }

        if (dependentTask.eventId !== existingTask.eventId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Dependent task must belong to the same event',
          });
        }

        // Check for circular dependency
        const hasCircularDep = await detectCircularDependency(
          db,
          id,
          updates.dependsOnTaskId,
          existingTask.eventId
        );

        if (hasCircularDep) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot create circular dependency',
          });
        }
      }

      // Build update object
      const updateData: any = { updatedAt: new Date() };
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
      if (updates.dependsOnTaskId !== undefined) updateData.dependsOnTaskId = updates.dependsOnTaskId;

      const [updatedTask] = await db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, id))
        .returning();

      return updatedTask;
    }),

  // FR-013: Delete task (administrators only)
  delete: adminProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      // Verify task exists
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.id))
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check for dependent tasks
      const dependentTasks = await db
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(eq(tasks.dependsOnTaskId, input.id));

      if (dependentTasks.length > 0) {
        // Clear dependencies instead of blocking deletion
        await db
          .update(tasks)
          .set({ dependsOnTaskId: null, updatedAt: new Date() })
          .where(eq(tasks.dependsOnTaskId, input.id));
      }

      // Delete task
      await db.delete(tasks).where(eq(tasks.id, input.id));

      return { success: true, clearedDependencies: dependentTasks.length };
    }),

  // Get users for task assignment (staff only, not clients)
  getAssignableUsers: protectedProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const activeUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.isActive, true), ne(users.role, 'client')))
      .orderBy(users.name);

    return activeUsers;
  }),

  // Get tasks available as dependencies (for dropdown)
  getAvailableDependencies: protectedProcedure
    .input(z.object({
      eventId: z.number().positive(),
      excludeTaskId: z.number().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const { eventId, excludeTaskId } = input;

      const conditions = [eq(tasks.eventId, eventId)];
      if (excludeTaskId) {
        conditions.push(ne(tasks.id, excludeTaskId));
      }

      const availableTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          category: tasks.category,
        })
        .from(tasks)
        .where(and(...conditions))
        .orderBy(tasks.category, tasks.title);

      return availableTasks;
    }),

  // FR-012: Flag overdue tasks - utility endpoint for cron job
  markOverdueTasks: adminProcedure.mutation(async ({ ctx }) => {
    const { db } = ctx;
    const now = new Date();

    // Mark tasks as overdue if:
    // - due_date is in the past
    // - status is not 'completed'
    // - is_overdue is currently false
    const result = await db
      .update(tasks)
      .set({
        isOverdue: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          lt(tasks.dueDate, now),
          ne(tasks.status, 'completed'),
          eq(tasks.isOverdue, false)
        )
      )
      .returning({ id: tasks.id });

    return { markedCount: result.length };
  }),
});
