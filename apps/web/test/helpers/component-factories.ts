/**
 * Component test data factories.
 *
 * These are pure functions that return plain objects for component testing.
 * Unlike the database factories in factories.ts, these don't touch the database.
 *
 * Usage:
 * ```tsx
 * import { mockEvent, mockTask } from '@/test/helpers/component-factories';
 *
 * it('renders event card', () => {
 *   render(<EventCard event={mockEvent({ eventName: 'Custom Name' })} />);
 * });
 * ```
 */

let counter = 0;

/**
 * Reset the factory counter. Call in beforeEach for test isolation.
 */
export function resetMockCounter() {
  counter = 0;
}

function nextId() {
  return ++counter;
}

// ============================================================================
// Event Types
// ============================================================================

export type EventStatus =
  | 'inquiry'
  | 'planning'
  | 'preparation'
  | 'in_progress'
  | 'completed'
  | 'follow_up';

export interface MockEvent {
  id: number;
  eventName: string;
  status: EventStatus;
  eventDate: Date;
  location: string | null;
  estimatedAttendees: number | null;
  notes: string | null;
  isArchived: boolean;
  clientId: number;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface MockEventWithClient extends MockEvent {
  client: MockClient;
  taskCount?: number;
  completedTaskCount?: number;
}

export function mockEvent(overrides: Partial<MockEvent> = {}): MockEvent {
  const id = overrides.id ?? nextId();
  const now = new Date();

  return {
    id,
    eventName: `Test Event ${id}`,
    status: 'inquiry',
    eventDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    location: 'Test Location',
    estimatedAttendees: 100,
    notes: null,
    isArchived: false,
    clientId: 1,
    createdById: 1,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    ...overrides,
  };
}

export function mockEventWithClient(
  overrides: Partial<MockEventWithClient> = {}
): MockEventWithClient {
  const event = mockEvent(overrides);
  return {
    ...event,
    client: overrides.client ?? mockClient({ id: event.clientId }),
    taskCount: overrides.taskCount ?? 0,
    completedTaskCount: overrides.completedTaskCount ?? 0,
  };
}

// ============================================================================
// Task Types
// ============================================================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskCategory = 'pre_event' | 'during_event' | 'post_event';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface MockTask {
  id: number;
  eventId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedHours: number | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  dueDate: Date | null;
  assignedToId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockTaskWithAssignee extends MockTask {
  assignedTo: { id: number; name: string; email: string } | null;
  event?: { id: number; eventName: string };
}

export function mockTask(overrides: Partial<MockTask> = {}): MockTask {
  const id = overrides.id ?? nextId();
  const now = new Date();

  return {
    id,
    eventId: 1,
    title: `Test Task ${id}`,
    description: null,
    status: 'pending',
    category: 'pre_event',
    priority: 'medium',
    estimatedHours: null,
    scheduledStart: null,
    scheduledEnd: null,
    dueDate: null,
    assignedToId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function mockTaskWithAssignee(
  overrides: Partial<MockTaskWithAssignee> = {}
): MockTaskWithAssignee {
  const task = mockTask(overrides);
  return {
    ...task,
    assignedTo: overrides.assignedTo ?? null,
    event: overrides.event,
  };
}

// ============================================================================
// Client Types
// ============================================================================

export interface MockClient {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockClientWithStats extends MockClient {
  eventCount: number;
  lastEventDate: Date | null;
  dueFollowUps: number;
}

export function mockClient(overrides: Partial<MockClient> = {}): MockClient {
  const id = overrides.id ?? nextId();
  const now = new Date();

  return {
    id,
    companyName: `Test Company ${id}`,
    contactName: `Test Contact ${id}`,
    email: `contact${id}@example.com`,
    phone: '+1-555-0100',
    address: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function mockClientWithStats(
  overrides: Partial<MockClientWithStats> = {}
): MockClientWithStats {
  const client = mockClient(overrides);
  return {
    ...client,
    eventCount: overrides.eventCount ?? 0,
    lastEventDate: overrides.lastEventDate ?? null,
    dueFollowUps: overrides.dueFollowUps ?? 0,
  };
}

// ============================================================================
// Resource Types
// ============================================================================

export type ResourceType = 'staff' | 'equipment' | 'materials';

export interface MockResource {
  id: number;
  name: string;
  type: ResourceType;
  hourlyRate: number | null;
  isAvailable: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mockResource(overrides: Partial<MockResource> = {}): MockResource {
  const id = overrides.id ?? nextId();
  const now = new Date();

  return {
    id,
    name: `Test Resource ${id}`,
    type: 'staff',
    hourlyRate: 25.0,
    isAvailable: true,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================================================
// Communication Types
// ============================================================================

export type CommunicationType = 'email' | 'phone' | 'meeting' | 'other';

export interface MockCommunication {
  id: number;
  clientId: number;
  eventId: number | null;
  type: CommunicationType;
  subject: string | null;
  notes: string;
  contactedAt: Date;
  followUpDate: Date | null;
  isCompleted: boolean;
  createdById: number;
  createdAt: Date;
}

export function mockCommunication(overrides: Partial<MockCommunication> = {}): MockCommunication {
  const id = overrides.id ?? nextId();
  const now = new Date();

  return {
    id,
    clientId: 1,
    eventId: null,
    type: 'email',
    subject: `Test Communication ${id}`,
    notes: 'Test communication notes',
    contactedAt: now,
    followUpDate: null,
    isCompleted: false,
    createdById: 1,
    createdAt: now,
    ...overrides,
  };
}

// ============================================================================
// Status History Types
// ============================================================================

export interface MockStatusHistory {
  id: number;
  eventId: number;
  previousStatus: EventStatus | null;
  newStatus: EventStatus;
  changedAt: Date;
  changedById: number;
  changedByName: string;
  notes: string | null;
}

export function mockStatusHistory(overrides: Partial<MockStatusHistory> = {}): MockStatusHistory {
  const id = overrides.id ?? nextId();

  return {
    id,
    eventId: 1,
    previousStatus: null,
    newStatus: 'inquiry',
    changedAt: new Date(),
    changedById: 1,
    changedByName: 'Test User',
    notes: null,
    ...overrides,
  };
}

// ============================================================================
// Conflict Types (for resource scheduling)
// ============================================================================

export interface MockConflict {
  resourceId: number;
  resourceName: string;
  conflictingEventId: number;
  conflictingEventName: string;
  existingStartTime: Date;
  existingEndTime: Date;
  message: string;
}

export function mockConflict(overrides: Partial<MockConflict> = {}): MockConflict {
  const now = new Date();

  return {
    resourceId: 1,
    resourceName: 'Test Resource',
    conflictingEventId: 1,
    conflictingEventName: 'Conflicting Event',
    existingStartTime: now,
    existingEndTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
    message: 'Resource is already scheduled during this time',
    ...overrides,
  };
}

// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'administrator' | 'manager';

export interface MockUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  const id = overrides.id ?? nextId();

  return {
    id,
    email: `user${id}@example.com`,
    name: `Test User ${id}`,
    role: 'administrator',
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface MockEventCompletion {
  totalEvents: number;
  completedEvents: number;
  completionRate: number;
  eventsByStatus: Array<{
    status: EventStatus;
    count: number;
    percentage: number;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    total: number;
    completed: number;
    rate: number;
  }>;
}

export function mockEventCompletion(
  overrides: Partial<MockEventCompletion> = {}
): MockEventCompletion {
  return {
    totalEvents: 10,
    completedEvents: 7,
    completionRate: 70,
    eventsByStatus: [
      { status: 'completed', count: 7, percentage: 70 },
      { status: 'in_progress', count: 2, percentage: 20 },
      { status: 'planning', count: 1, percentage: 10 },
    ],
    monthlyBreakdown: [
      { month: '2026-01', total: 5, completed: 3, rate: 60 },
      { month: '2025-12', total: 5, completed: 4, rate: 80 },
    ],
    ...overrides,
  };
}

export interface MockResourceUtilization {
  resources: Array<{
    id: number;
    name: string;
    type: ResourceType;
    totalHoursScheduled: number;
    utilizationRate: number;
    revenueGenerated: number | null;
  }>;
}

export function mockResourceUtilization(
  overrides: Partial<MockResourceUtilization> = {}
): MockResourceUtilization {
  return {
    resources: [
      {
        id: 1,
        name: 'Head Chef',
        type: 'staff',
        totalHoursScheduled: 120,
        utilizationRate: 75,
        revenueGenerated: 3000,
      },
      {
        id: 2,
        name: 'Catering Van',
        type: 'equipment',
        totalHoursScheduled: 80,
        utilizationRate: 50,
        revenueGenerated: null,
      },
    ],
    ...overrides,
  };
}
