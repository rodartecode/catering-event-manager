# tRPC Router Contracts

**Feature**: 001-event-lifecycle-management
**Date**: 2025-10-19
**Version**: 1.0.0

## Overview

This document defines all tRPC procedures for the Next.js application. These contracts are implemented in `apps/web/src/server/routers/` and provide type-safe API access from the frontend.

### Router Organization

```typescript
// apps/web/src/server/routers/_app.ts
import { router } from '../trpc';
import { eventRouter } from './event';
import { taskRouter } from './task';
import { clientRouter } from './client';
import { resourceRouter } from './resource';
import { analyticsRouter } from './analytics';
import { userRouter } from './user';

export const appRouter = router({
  event: eventRouter,
  task: taskRouter,
  client: clientRouter,
  resource: resourceRouter,
  analytics: analyticsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
```

---

## 1. Event Router

**File**: `apps/web/src/server/routers/event.ts`

### User Story 1: Create and Track Events (Priority: P1)

#### `event.create`

**Type**: `mutation`
**Auth**: Required (administrator only)
**Maps to**: FR-001

```typescript
input: z.object({
  clientId: z.number().positive(),
  eventName: z.string().min(1).max(255),
  eventDate: z.date(),
  location: z.string().max(500).optional(),
  estimatedAttendees: z.number().positive().optional(),
  notes: z.string().optional(),
})

output: z.object({
  id: z.number(),
  clientId: z.number(),
  eventName: z.string(),
  eventDate: z.date(),
  location: z.string().nullable(),
  status: z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']),
  createdAt: z.date(),
})
```

**Success Criteria**: SC-001 (create event in <5 minutes)

---

#### `event.list`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-004

```typescript
input: z.object({
  status: z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up', 'all']).optional(),
  clientId: z.number().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().optional(), // For pagination
})

output: z.object({
  items: z.array(z.object({
    id: z.number(),
    eventName: z.string(),
    clientName: z.string(),
    eventDate: z.date(),
    status: z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']),
    taskCount: z.number(),
    completedTaskCount: z.number(),
  })),
  nextCursor: z.number().nullable(),
})
```

**Performance**: Indexed query, <500ms response time

---

#### `event.getById`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-005

```typescript
input: z.object({
  id: z.number().positive(),
})

output: z.object({
  id: z.number(),
  client: z.object({
    id: z.number(),
    companyName: z.string(),
    contactName: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
  }),
  eventName: z.string(),
  eventDate: z.date(),
  location: z.string().nullable(),
  status: z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']),
  estimatedAttendees: z.number().nullable(),
  notes: z.string().nullable(),
  tasks: z.array(z.object({
    id: z.number(),
    title: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed']),
    dueDate: z.date().nullable(),
    assignedTo: z.string().nullable(),
  })),
  statusHistory: z.array(z.object({
    oldStatus: z.string().nullable(),
    newStatus: z.string(),
    changedBy: z.string(),
    changedAt: z.date(),
    notes: z.string().nullable(),
  })),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
```

---

#### `event.updateStatus`

**Type**: `mutation`
**Auth**: Required (administrator only)
**Maps to**: FR-002, FR-003

```typescript
input: z.object({
  id: z.number().positive(),
  newStatus: z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']),
  notes: z.string().optional(),
})

output: z.object({
  id: z.number(),
  status: z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']),
  updatedAt: z.date(),
})
```

**Side Effects**:
- Logs status change to `event_status_log` (FR-003)
- Emits real-time update via `event.onStatusChange` subscription (SC-004)

---

#### `event.update`

**Type**: `mutation`
**Auth**: Required (administrator only)
**Maps to**: FR-006

```typescript
input: z.object({
  id: z.number().positive(),
  eventName: z.string().min(1).max(255).optional(),
  eventDate: z.date().optional(),
  location: z.string().max(500).optional(),
  estimatedAttendees: z.number().positive().optional(),
  notes: z.string().optional(),
})

output: z.object({
  id: z.number(),
  eventName: z.string(),
  eventDate: z.date(),
  location: z.string().nullable(),
  updatedAt: z.date(),
})
```

---

#### `event.archive`

**Type**: `mutation`
**Auth**: Required (administrator only)
**Maps to**: FR-007

```typescript
input: z.object({
  id: z.number().positive(),
})

output: z.object({
  id: z.number(),
  isArchived: z.boolean(),
  archivedAt: z.date(),
  archivedBy: z.string(),
})
```

**Validation**:
- Only events with `status = 'completed'` can be archived
- Updates `is_archived = true`, `archived_at = NOW()`, `archived_by = current_user_id`

---

#### `event.onStatusChange` (Subscription)

**Type**: `subscription`
**Auth**: Required
**Maps to**: SC-004 (2-second real-time updates)

```typescript
input: z.object({
  eventId: z.number().positive().optional(), // Subscribe to specific event or all events
})

output: z.object({
  eventId: z.number(),
  oldStatus: z.string().nullable(),
  newStatus: z.string(),
  changedBy: z.string(),
  changedAt: z.date(),
})
```

**Protocol**: Server-Sent Events (SSE)

---

## 2. Task Router

**File**: `apps/web/src/server/routers/task.ts`

### User Story 2: Manage Event Tasks (Priority: P2)

#### `task.create`

**Type**: `mutation`
**Auth**: Required (administrator only)
**Maps to**: FR-008, FR-009, FR-010

```typescript
input: z.object({
  eventId: z.number().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  category: z.enum(['pre_event', 'during_event', 'post_event']),
  assignedTo: z.number().positive().optional(),
  dependsOnTaskId: z.number().positive().optional(), // FR-014
})

output: z.object({
  id: z.number(),
  eventId: z.number(),
  title: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  category: z.enum(['pre_event', 'during_event', 'post_event']),
  dueDate: z.date().nullable(),
  assignedTo: z.string().nullable(),
  createdAt: z.date(),
})
```

**Validation**:
- `dependsOnTaskId` must exist and belong to same event
- No circular dependencies (application layer check)

---

#### `task.assign`

**Type**: `mutation`
**Auth**: Required (administrator or manager)
**Maps to**: FR-013

```typescript
input: z.object({
  taskId: z.number().positive(),
  assignedTo: z.number().positive(),
})

output: z.object({
  taskId: z.number(),
  assignedTo: z.string(),
  assignedAt: z.date(),
})
```

**Side Effects**:
- Sends notification to assigned user (email/in-app)
- Emits `task.onUpdate` subscription event

---

#### `task.updateStatus`

**Type**: `mutation`
**Auth**: Required (manager can update assigned tasks)
**Maps to**: FR-011

```typescript
input: z.object({
  taskId: z.number().positive(),
  status: z.enum(['pending', 'in_progress', 'completed']),
})

output: z.object({
  taskId: z.number(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  completedAt: z.date().nullable(),
  completedBy: z.string().nullable(),
})
```

**Validation**:
- If `status = 'completed'`, check task dependencies are complete (FR-014)
- Set `completed_at = NOW()`, `completed_by = current_user_id`

---

#### `task.listByEvent`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-009

```typescript
input: z.object({
  eventId: z.number().positive(),
  status: z.enum(['pending', 'in_progress', 'completed', 'all']).optional(),
  category: z.enum(['pre_event', 'during_event', 'post_event', 'all']).optional(),
})

output: z.array(z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  category: z.enum(['pre_event', 'during_event', 'post_event']),
  dueDate: z.date().nullable(),
  isOverdue: z.boolean(),
  assignedTo: z.string().nullable(),
  dependsOn: z.object({
    taskId: z.number(),
    taskTitle: z.string(),
    isCompleted: z.boolean(),
  }).nullable(),
}))
```

---

#### `task.assignResources`

**Type**: `mutation`
**Auth**: Required (administrator or manager)
**Maps to**: FR-016 (User Story 3)

```typescript
input: z.object({
  taskId: z.number().positive(),
  resourceIds: z.array(z.number().positive()).min(1),
})

output: z.object({
  taskId: z.number(),
  assignedResources: z.array(z.object({
    id: z.number(),
    resourceName: z.string(),
    resourceType: z.enum(['staff', 'equipment', 'materials']),
  })),
  conflicts: z.array(z.object({
    resourceId: z.number(),
    resourceName: z.string(),
    conflictingEventId: z.number(),
    conflictingEventName: z.string(),
  })),
})
```

**Side Effects**:
- Calls Go scheduling service `/api/v1/scheduling/check-conflicts` (FR-017)
- If conflicts exist, returns warning (FR-019) but allows override by administrator

---

#### `task.onUpdate` (Subscription)

**Type**: `subscription`
**Auth**: Required

```typescript
input: z.object({
  eventId: z.number().positive().optional(),
  assignedToMe: z.boolean().optional(), // Only tasks assigned to current user
})

output: z.object({
  taskId: z.number(),
  eventId: z.number(),
  title: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  assignedTo: z.string().nullable(),
  updatedAt: z.date(),
})
```

---

## 3. Client Router

**File**: `apps/web/src/server/routers/client.ts`

### User Story 5: Client Communication (Priority: P5)

#### `client.create`

**Type**: `mutation`
**Auth**: Required (administrator only)
**Maps to**: FR-020

```typescript
input: z.object({
  companyName: z.string().min(1).max(255),
  contactName: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

output: z.object({
  id: z.number(),
  companyName: z.string(),
  contactName: z.string(),
  email: z.string(),
  createdAt: z.date(),
})
```

---

#### `client.list`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-020

```typescript
input: z.object({
  search: z.string().optional(), // Search by company name or contact name
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().optional(),
})

output: z.object({
  items: z.array(z.object({
    id: z.number(),
    companyName: z.string(),
    contactName: z.string(),
    email: z.string(),
    eventCount: z.number(),
    lastEventDate: z.date().nullable(),
  })),
  nextCursor: z.number().nullable(),
})
```

---

#### `client.getById`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-021

```typescript
input: z.object({
  id: z.number().positive(),
})

output: z.object({
  id: z.number(),
  companyName: z.string(),
  contactName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  events: z.array(z.object({
    id: z.number(),
    eventName: z.string(),
    eventDate: z.date(),
    status: z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']),
  })),
  communications: z.array(z.object({
    id: z.number(),
    type: z.enum(['email', 'phone', 'meeting', 'other']),
    subject: z.string().nullable(),
    communicatedAt: z.date(),
    recordedBy: z.string(),
  })),
})
```

---

#### `client.recordCommunication`

**Type**: `mutation`
**Auth**: Required
**Maps to**: FR-022

```typescript
input: z.object({
  clientId: z.number().positive(),
  eventId: z.number().positive().optional(),
  type: z.enum(['email', 'phone', 'meeting', 'other']),
  subject: z.string().max(255).optional(),
  notes: z.string().min(1),
  communicatedAt: z.date(),
  followUpDate: z.date().optional(), // FR-023
})

output: z.object({
  id: z.number(),
  clientId: z.number(),
  type: z.enum(['email', 'phone', 'meeting', 'other']),
  communicatedAt: z.date(),
  followUpDate: z.date().nullable(),
})
```

---

## 4. Resource Router

**File**: `apps/web/src/server/routers/resource.ts`

### User Story 3: Resource Assignment (Priority: P3)

#### `resource.create`

**Type**: `mutation`
**Auth**: Required (administrator only)
**Maps to**: FR-015

```typescript
input: z.object({
  resourceName: z.string().min(1).max(255),
  resourceType: z.enum(['staff', 'equipment', 'materials']),
  description: z.string().optional(),
})

output: z.object({
  id: z.number(),
  resourceName: z.string(),
  resourceType: z.enum(['staff', 'equipment', 'materials']),
  isAvailable: z.boolean(),
})
```

---

#### `resource.getSchedule`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-018

```typescript
input: z.object({
  resourceId: z.number().positive(),
  dateFrom: z.date(),
  dateTo: z.date(),
})

output: z.array(z.object({
  eventId: z.number(),
  eventName: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  taskTitle: z.string(),
}))
```

**Performance**: Indexed query using GiST time range index

---

#### `resource.checkConflicts`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-017, FR-019

```typescript
input: z.object({
  resourceId: z.number().positive(),
  startTime: z.date(),
  endTime: z.date(),
  excludeTaskId: z.number().positive().optional(), // Exclude current task when updating
})

output: z.object({
  hasConflicts: z.boolean(),
  conflicts: z.array(z.object({
    eventId: z.number(),
    eventName: z.string(),
    taskId: z.number(),
    taskTitle: z.string(),
    startTime: z.date(),
    endTime: z.date(),
  })),
})
```

**Implementation**: Calls Go scheduling service `/api/v1/scheduling/check-conflicts`

---

## 5. Analytics Router

**File**: `apps/web/src/server/routers/analytics.ts`

### User Story 4: Analytics (Priority: P4)

#### `analytics.eventCompletion`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-024

```typescript
input: z.object({
  dateFrom: z.date(),
  dateTo: z.date(),
})

output: z.object({
  totalEvents: z.number(),
  completedEvents: z.number(),
  completionRate: z.number(),
  averageDaysToComplete: z.number(),
  byStatus: z.array(z.object({
    status: z.enum(['inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up']),
    count: z.number(),
  })),
})
```

**Performance**: SC-005 (<10 seconds for report generation)

---

#### `analytics.resourceUtilization`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-025

```typescript
input: z.object({
  dateFrom: z.date(),
  dateTo: z.date(),
  resourceType: z.enum(['staff', 'equipment', 'materials', 'all']).optional(),
})

output: z.array(z.object({
  resourceId: z.number(),
  resourceName: z.string(),
  resourceType: z.enum(['staff', 'equipment', 'materials']),
  assignedTasks: z.number(),
  totalHoursAllocated: z.number(),
  utilizationPercentage: z.number(),
}))
```

---

#### `analytics.taskPerformance`

**Type**: `query`
**Auth**: Required
**Maps to**: FR-027

```typescript
input: z.object({
  dateFrom: z.date(),
  dateTo: z.date(),
  category: z.enum(['pre_event', 'during_event', 'post_event', 'all']).optional(),
})

output: z.array(z.object({
  category: z.enum(['pre_event', 'during_event', 'post_event']),
  totalTasks: z.number(),
  completedTasks: z.number(),
  averageCompletionTime: z.number(), // In hours
  overdueCount: z.number(),
}))
```

---

## 6. User Router

**File**: `apps/web/src/server/routers/user.ts`

#### `user.getCurrentUser`

**Type**: `query`
**Auth**: Required

```typescript
input: null

output: z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['administrator', 'manager']),
})
```

---

## Type Safety

All procedures generate TypeScript types automatically:

```typescript
// Client-side usage (full type safety)
import { trpc } from '@/lib/trpc';

const { data: events } = trpc.event.list.useQuery({
  status: 'in_progress',
  limit: 20,
});
// ✅ events is fully typed: { items: Event[], nextCursor: number | null }

const createEvent = trpc.event.create.useMutation();
await createEvent.mutateAsync({
  clientId: 1,
  eventName: 'Wedding Reception',
  eventDate: new Date('2025-12-15'),
});
// ✅ Compile-time error if any field is missing or wrong type
```

---

## Next Steps

1. Implement routers in `apps/web/src/server/routers/`
2. Generate OpenAPI spec for Go scheduling service (`scheduling-api-openapi.yaml`)
3. Write contract tests (Vitest + MSW for mocks)
