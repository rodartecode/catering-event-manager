# API Documentation

**Last updated**: 2026-02-01
**Version**: 1.0
**Base URL**: `http://localhost:3000/api/trpc` (dev) | `https://catering-dev.vercel.app/api/trpc` (prod)

This document describes the complete tRPC API for the production-ready Catering Event Manager system. All 8 development phases are complete with 44 total procedures implemented.

## Authentication

The API uses Next-Auth v5 session-based authentication with three roles:

- **protectedProcedure**: Any authenticated user (admin or manager)
- **adminProcedure**: Administrator role only (full CRUD access)
- **clientProcedure**: Client role only (read-only portal access)

## API Overview

| Router | Purpose | Procedures | Auth | Status |
|--------|---------|------------|------|--------|
| `event` | Event lifecycle management | 8 procedures | admin/protected | ✅ 100% Complete |
| `task` | Task management & assignment | 6 procedures | admin/protected | ✅ 100% Complete |
| `resource` | Resource scheduling & conflicts | 7 procedures | admin/protected | ✅ 100% Complete |
| `analytics` | Reporting & data analysis | 3 procedures | protected | ✅ 100% Complete |
| `clients` | Client & communication management | 10 procedures | admin/protected | ✅ 100% Complete |
| `user` | User management | 3 procedures | protected | ✅ 100% Complete |
| `portal` | Client portal (read-only access) | 7 procedures | client | ✅ 100% Complete |

**Total**: 44 procedures across 7 routers | **Test Coverage**: 646 tests passing | **Production Status**: Live on Vercel

---

## Event Router (`event`)

Manages the complete event lifecycle from inquiry to follow-up.

### `event.create`

**Auth**: Administrator only
**Purpose**: Create a new event

```typescript
// Input
{
  clientId: number;          // Required: Client ID
  eventName: string;         // Required: Event name (1-255 chars)
  eventDate: Date;          // Required: Event date
  location?: string;        // Optional: Event location (max 500 chars)
  estimatedAttendees?: number; // Optional: Expected attendee count
  notes?: string;           // Optional: Additional notes
}

// Response
{
  id: number;
  eventName: string;
  status: 'inquiry';        // Always starts as 'inquiry'
  eventDate: Date;
  createdAt: Date;
}
```

### `event.list`

**Auth**: Any authenticated user
**Purpose**: List events with filtering and pagination

```typescript
// Input
{
  status?: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up' | 'all';
  clientId?: number;        // Filter by specific client
  dateFrom?: Date;         // Filter by date range start
  dateTo?: Date;           // Filter by date range end
  limit?: number;          // Pagination limit (default: 50, max: 100)
  cursor?: number;         // Cursor for pagination
  includeArchived?: boolean; // Include archived events (default: false)
}

// Response
{
  items: Array<{
    id: number;
    eventName: string;
    status: EventStatus;
    eventDate: Date;
    clientName: string;
    location: string | null;
    estimatedAttendees: number | null;
  }>;
  nextCursor: number | null;
}
```

### `event.getById`

**Auth**: Any authenticated user
**Purpose**: Get detailed event information

```typescript
// Input
{ id: number }

// Response
{
  id: number;
  eventName: string;
  status: EventStatus;
  eventDate: Date;
  location: string | null;
  estimatedAttendees: number | null;
  notes: string | null;
  isArchived: boolean;
  client: {
    id: number;
    companyName: string;
    contactName: string;
    email: string;
  };
  statusHistory: Array<{
    previousStatus: EventStatus | null;
    newStatus: EventStatus;
    changedAt: Date;
    changedBy: string;
  }>;
  tasks: Array<{
    id: number;
    title: string;
    status: TaskStatus;
    assignedTo: string | null;
  }>;
}
```

### `event.updateStatus`

**Auth**: Any authenticated user
**Purpose**: Update event status in lifecycle

```typescript
// Input
{
  id: number;
  status: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up';
  notes?: string;
}

// Response
{
  id: number;
  status: EventStatus;
  updatedAt: Date;
}
```

### `event.archive`

**Auth**: Administrator only
**Purpose**: Archive (soft delete) an event

```typescript
// Input
{ id: number }

// Response
{
  id: number;
  isArchived: true;
  archivedAt: Date;
}
```

### Real-Time Updates

**Status**: Currently uses polling instead of subscriptions for reliability.

Event detail pages automatically refresh data every 5 seconds using `refetchInterval` on the `useQuery` hook. This provides near-real-time updates without the complexity of WebSocket management.

Future implementation will use Server-Sent Events (SSE) for true real-time updates when subscription infrastructure (Redis Pub/Sub, PostgreSQL LISTEN/NOTIFY) is implemented.

---

## Task Router (`task`)

Manages task assignment, completion tracking, and resource allocation.

### `task.create`

**Auth**: Administrator only

```typescript
// Input
{
  eventId: number;
  title: string;              // Required (1-255 chars)
  description?: string;
  category: 'pre_event' | 'during_event' | 'post_event';
  dueDate?: Date;            // Optional task due date
  dependsOnTaskId?: number;  // Optional dependency on another task
}

// Response
{
  id: number;
  title: string;
  status: 'pending';         // Always starts as 'pending'
  createdAt: Date;
}
```

### `task.list`

**Auth**: Any authenticated user

```typescript
// Input
{
  eventId: number;           // Required: Filter by event
  status?: 'pending' | 'in_progress' | 'completed' | 'all';
  category?: 'pre_event' | 'during_event' | 'post_event' | 'all';
  overdueOnly?: boolean;     // Filter for overdue tasks only
  assignedToMe?: boolean;    // Filter for tasks assigned to current user
  limit?: number;            // Default: 50, max: 100
  cursor?: number;           // Pagination cursor
}

// Response
{
  items: Array<{
    id: number;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    category: 'pre_event' | 'during_event' | 'post_event';
    dueDate: Date | null;
    dependsOnTaskId: number | null;
    isOverdue: boolean;
    completedAt: Date | null;
    assignee: {
      id: number;
      name: string;
      email: string;
    } | null;
  }>;
  nextCursor: number | null;
}
```

### `task.updateStatus`

**Auth**: Any authenticated user

```typescript
// Input
{
  id: number;
  newStatus: 'pending' | 'in_progress' | 'completed';
}

// Response
{
  id: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt: Date | null;
  updatedAt: Date;
}
```

### `task.assignResources`

**Auth**: Administrator only

```typescript
// Input
{
  taskId: number;
  resourceIds: number[];     // Array of resource IDs to assign
  startTime: Date;          // When resource assignment starts
  endTime: Date;            // When resource assignment ends
  force?: boolean;          // Allow assignment despite conflicts (default: false)
}

// Response
{
  success: boolean;
  assignedResources: number;
  conflicts?: Array<{
    resourceId: number;
    resourceName: string;
    message: string;
  }>;
  warning?: string;         // If scheduling service unavailable
  forceOverride?: boolean;  // If conflicts were overridden
}
```

---

## Resource Router (`resource`)

Manages staff, equipment, and resource scheduling with conflict detection.

### `resource.create`

**Auth**: Administrator only

```typescript
// Input
{
  name: string;              // Required (1-255 chars)
  type: 'staff' | 'equipment' | 'materials';
  hourlyRate?: number;       // Decimal currency (optional)
  isAvailable?: boolean;     // Default: true
  notes?: string;            // Optional notes
}

// Response
{
  id: number;
  name: string;
  type: 'staff' | 'equipment' | 'materials';
  hourlyRate: number | null;
  isAvailable: boolean;
  createdAt: Date;
}
```

### `resource.list`

**Auth**: Any authenticated user

```typescript
// Input
{
  type?: 'staff' | 'equipment' | 'materials' | 'all';
  isAvailable?: boolean;     // Filter by availability status
  search?: string;           // Search by resource name
  limit?: number;            // Default: 50, max: 100
  cursor?: number;           // Pagination cursor
}

// Response
{
  items: Array<{
    id: number;
    name: string;
    type: 'staff' | 'equipment' | 'materials';
    hourlyRate: number | null;
    isAvailable: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  nextCursor: number | null;
}
```

### `resource.checkConflicts`

**Auth**: Administrator only
**Purpose**: Check for scheduling conflicts (integrates with Go service)

```typescript
// Input
{
  resourceIds: number[];
  startTime: Date;
  endTime: Date;
  excludeScheduleId?: number;
}

// Response
{
  hasConflicts: boolean;
  conflicts: Array<{
    resourceId: number;
    resourceName: string;
    conflictingEventId: number;
    conflictingEventName: string;
    existingStartTime: Date;
    existingEndTime: Date;
    message: string;
  }>;
}
```

### `resource.getSchedule`

**Auth**: Any authenticated user
**Purpose**: Get resource availability/schedule

```typescript
// Input
{
  resourceId: number;
  startDate: Date;
  endDate: Date;
}

// Response
{
  resourceId: number;
  entries: Array<{
    id: number;
    eventId: number;
    eventName: string;
    taskId: number | null;
    taskTitle: string | null;
    startTime: Date;
    endTime: Date;
    notes: string | null;
  }>;
}
```

---

## Analytics Router (`analytics`)

Provides reporting and data analysis capabilities with caching.

### `analytics.eventCompletion`

**Auth**: Any authenticated user
**Purpose**: Event completion rate analysis

```typescript
// Input
{
  dateFrom: Date;
  dateTo: Date;
}

// Response
{
  totalEvents: number;
  completedEvents: number;
  completionRate: number;    // Percentage (0-100)
  eventsByStatus: Array<{
    status: EventStatus;
    count: number;
    percentage: number;
  }>;
  monthlyBreakdown: Array<{
    month: string;           // YYYY-MM format
    total: number;
    completed: number;
    rate: number;
  }>;
}
```

### `analytics.resourceUtilization`

**Auth**: Any authenticated user

```typescript
// Input
{
  dateFrom: Date;
  dateTo: Date;
}

// Response
{
  resources: Array<{
    id: number;
    name: string;
    type: 'staff' | 'equipment' | 'materials';
    totalHoursScheduled: number;
    utilizationRate: number; // Percentage (0-100)
    revenueGenerated: number | null;
  }>;
}
```

### `analytics.taskPerformance`

**Auth**: Any authenticated user

```typescript
// Input
{
  dateFrom: Date;
  dateTo: Date;
}

// Response
{
  tasksByCategory: Array<{
    category: 'pre_event' | 'during_event' | 'post_event';
    total: number;
    completed: number;
    averageCompletionTime: number; // Hours
  }>;
  overdueStats: {
    totalOverdue: number;
    overdueByCategory: Record<'pre_event' | 'during_event' | 'post_event', number>;
  };
}
```

---

## Clients Router (`clients`)

Manages client information and communication tracking.

### `clients.create`

**Auth**: Administrator only

```typescript
// Input
{
  companyName: string;       // Required (1-255 chars)
  contactName: string;       // Required (1-255 chars)
  email: string;            // Required (valid email, max 255 chars)
  phone?: string;           // Optional (max 50 chars)
  address?: string;         // Optional
  notes?: string;           // Optional
}
```

### `clients.list`

**Auth**: Any authenticated user

```typescript
// Input
{
  search?: string;          // Search by company name or contact name
  limit?: number;           // Default: 50, max: 100
  cursor?: number;
}

// Response
{
  items: Array<{
    id: number;
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    eventCount: number;
    lastEventDate: Date | null;
    dueFollowUps: number;    // Count of overdue follow-ups
  }>;
  nextCursor: number | null;
}
```

### `clients.recordCommunication`

**Auth**: Administrator only

```typescript
// Input
{
  clientId: number;
  eventId?: number;         // Optional: associate with specific event
  type: 'email' | 'phone' | 'meeting' | 'other';
  subject?: string;         // Optional (max 255 chars)
  notes: string;           // Required (min 1 char)
  contactedAt: Date;       // When communication occurred
  followUpDate?: Date;     // Optional: schedule follow-up
}

// Response
{
  id: number;
  clientId: number;
  type: CommunicationType;
  contactedAt: Date;
  followUpDate: Date | null;
  createdAt: Date;
}
```

### `clients.getDueFollowUps`

**Auth**: Any authenticated user
**Purpose**: Get all overdue and due-today follow-ups

```typescript
// Response
{
  dueToday: Array<{
    id: number;
    clientId: number;
    clientName: string;
    type: CommunicationType;
    followUpDate: Date;
    daysDue: number;        // Always 0 for due today
    subject: string | null;
    notes: string;
  }>;
  overdue: Array<{
    id: number;
    clientId: number;
    clientName: string;
    type: CommunicationType;
    followUpDate: Date;
    daysDue: number;        // Positive number for overdue
    subject: string | null;
    notes: string;
  }>;
}
```

---

## User Router (`user`)

Basic user management (limited implementation).

### `user.me`

**Auth**: Any authenticated user

```typescript
// Response
{
  id: number;
  email: string;
  name: string | null;
  role: 'administrator' | 'manager';
  createdAt: Date;
}
```

---

## Portal Router (`portal`)

Client portal access with magic link authentication. All procedures require client authentication.

### `portal.getSummary`

**Auth**: Client only
**Purpose**: Get client portal dashboard summary

```typescript
// Response
{
  client: {
    id: number;
    companyName: string;
    contactName: string;
    email: string;
    portalEnabled: boolean;
  };
  eventStats: {
    total: number;
    byStatus: Record<EventStatus, number>;
    upcoming: number;
  };
  recentActivity: Array<{
    type: 'event_status_change' | 'communication' | 'task_update';
    description: string;
    timestamp: Date;
  }>;
}
```

### `portal.listEvents`

**Auth**: Client only
**Purpose**: List client's events

```typescript
// Input
{
  status?: EventStatus | 'all';
  limit?: number;          // Default: 50, max: 100
  cursor?: number;
}

// Response
{
  items: Array<{
    id: number;
    eventName: string;
    eventDate: Date;
    status: EventStatus;
    location: string | null;
    estimatedAttendees: number | null;
  }>;
  nextCursor: number | null;
}
```

### `portal.getEvent`

**Auth**: Client only (restricted to own events)
**Purpose**: Get detailed event information

```typescript
// Input
{ id: number }

// Response
{
  id: number;
  eventName: string;
  eventDate: Date;
  status: EventStatus;
  location: string | null;
  estimatedAttendees: number | null;
  notes: string | null;
  statusHistory: Array<{
    newStatus: EventStatus;
    changedAt: Date;
    notes: string | null;
  }>;
}
```

### `portal.getEventTimeline`

**Auth**: Client only
**Purpose**: Get event status timeline

```typescript
// Input
{ eventId: number }

// Response
{
  timeline: Array<{
    status: EventStatus;
    changedAt: Date;
    notes: string | null;
  }>;
}
```

### `portal.getEventTasks`

**Auth**: Client only
**Purpose**: Get tasks associated with client's event

```typescript
// Input
{ eventId: number }

// Response
{
  tasks: Array<{
    id: number;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    category: 'pre_event' | 'during_event' | 'post_event';
    dueDate: Date | null;
    isOverdue: boolean;
    dependsOnTaskId: number | null;
  }>;
}
```

### `portal.getEventCommunications`

**Auth**: Client only
**Purpose**: Get communications for client's event

```typescript
// Input
{ eventId: number }

// Response
{
  communications: Array<{
    id: number;
    type: CommunicationType;
    subject: string | null;
    notes: string | null;
    contactedAt: Date;
    followUpDate: Date | null;
    followUpCompleted: boolean;
  }>;
}
```

### `portal.getProfile`

**Auth**: Client only
**Purpose**: Get client profile information

```typescript
// Response
{
  client: {
    id: number;
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    address: string | null;
    portalEnabled: boolean;
    portalEnabledAt: Date | null;
  };
  portalUser: {
    id: number;
    email: string;
    name: string;
    lastLogin: Date | null;
  };
}
```

---

## Go Scheduling Service

**Base URL**: `http://localhost:8080/api/v1`

### Health Check

**Endpoint**: `GET /health`
**Auth**: None required

```json
{
  "status": "ok",
  "database": "connected"
}
```

### Check Conflicts

**Endpoint**: `POST /scheduling/check-conflicts`
**Auth**: None (internal service)

```typescript
// Request
{
  "resource_ids": number[];
  "start_time": string;     // ISO 8601 format
  "end_time": string;       // ISO 8601 format
  "exclude_schedule_id"?: number;
}

// Response
{
  "has_conflicts": boolean;
  "conflicts": Array<{
    "resource_id": number;
    "resource_name": string;
    "conflicting_event_id": number;
    "conflicting_event_name": string;
    "conflicting_task_id": number | null;
    "conflicting_task_title": string | null;
    "existing_start_time": string;
    "existing_end_time": string;
    "requested_start_time": string;
    "requested_end_time": string;
    "message": string;
  }>;
}
```

### Resource Availability

**Endpoint**: `GET /scheduling/resource-availability`
**Query Params**: `resource_id`, `start_date`, `end_date` (all required, ISO 8601 format)

```json
{
  "resource_id": number,
  "entries": [
    {
      "id": number,
      "resource_id": number,
      "event_id": number,
      "event_name": string,
      "task_id": number | null,
      "task_title": string | null,
      "start_time": string,
      "end_time": string,
      "notes": string | null,
      "created_at": string,
      "updated_at": string
    }
  ]
}
```

---

## Error Handling

All tRPC endpoints use standard error codes:

- `UNAUTHORIZED` (401): Authentication required or insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `BAD_REQUEST` (400): Invalid input data
- `INTERNAL_SERVER_ERROR` (500): Server error
- `CONFLICT` (409): Resource scheduling conflict

Example error response:
```json
{
  "error": {
    "json": {
      "message": "Event not found",
      "code": -32004,
      "data": {
        "code": "NOT_FOUND",
        "httpStatus": 404
      }
    }
  }
}
```

---

## Rate Limiting & Caching

- **Analytics queries**: Cached for 5 minutes to meet SC-005 (<10 seconds)
- **Scheduling conflicts**: Cached for 30 seconds (high-performance requirement)
- **Follow-up checks**: Cached for 1 hour

## Testing

### Test Infrastructure

✅ **Comprehensive testing infrastructure implemented:**

- **tRPC API Tests**: **123 tests** across all 6 routers using PostgreSQL Testcontainers
- **React Component Tests**: **173 tests** across 19 component files with mocked tRPC
- **Go Service Tests**: **46 tests** with 91.7% scheduler coverage
- **Integration Tests**: Real database testing for both TypeScript and Go services

### API Testing Commands

```bash
# TypeScript tests (tRPC API)
pnpm test                    # Run all tRPC router tests
pnpm test:coverage           # Generate coverage report

# Go service tests
cd apps/scheduling-service
go test ./...                # Run all Go tests
go test -cover ./...         # With coverage report
```

### Manual API Testing

Use the following endpoints to test API connectivity:

```bash
# Health check (Go service)
curl http://localhost:8080/api/v1/health

# tRPC health (requires auth)
curl http://localhost:3000/api/trpc/user.me

# Follow-up cron endpoint
curl http://localhost:3000/api/cron/follow-ups

# Go service conflict detection (requires JSON)
curl -X POST http://localhost:8080/api/v1/scheduling/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{"resource_ids": [1], "start_time": "2026-01-24T10:00:00Z", "end_time": "2026-01-24T14:00:00Z"}'

# Go service resource availability
curl "http://localhost:8080/api/v1/scheduling/resource-availability?resource_id=1&start_date=2026-01-24T00:00:00Z&end_date=2026-01-25T00:00:00Z"
```