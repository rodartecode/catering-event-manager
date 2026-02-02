import type { TestDatabase } from './db';
import {
  createClient,
  createCommunication,
  createEvent,
  createResource,
  createResourceSchedule,
  createTask,
  createUser,
} from './factories';

/**
 * Data context needed to generate valid inputs for all tRPC procedures.
 */
export interface AuthMatrixData {
  adminUser: { id: number; email: string };
  managerUser: { id: number; email: string };
  clientUser: { id: number; email: string; clientId: number };
  client: { id: number; email: string };
  event: { id: number; client_id: number };
  completedEvent: { id: number };
  task: { id: number; event_id: number };
  resource: { id: number };
  communication: { id: number };
  scheduleEntry: { id: number };
}

/**
 * Seeds all prerequisite entities needed for the authorization matrix.
 * Creates users, client, events, task, resource, communication, and schedule entry.
 */
export async function setupAuthMatrixData(db: TestDatabase): Promise<AuthMatrixData> {
  const adminUser = await createUser(db, {
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'administrator',
  });
  const managerUser = await createUser(db, {
    email: 'manager@test.com',
    name: 'Test Manager',
    role: 'manager',
  });

  const client = await createClient(db, {
    companyName: 'Auth Matrix Corp',
    contactName: 'Matrix Contact',
    email: 'matrix@test.com',
  });

  const clientUser = await createUser(db, {
    email: 'client@test.com',
    name: 'Test Client User',
    role: 'client',
    clientId: client.id,
  });

  const event = await createEvent(db, client.id, adminUser.id, {
    eventName: 'Auth Matrix Event',
    status: 'inquiry',
  });

  // Separate completed event for archive procedure
  const completedEvent = await createEvent(db, client.id, adminUser.id, {
    eventName: 'Completed Event For Archive',
    status: 'completed',
  });

  const task = await createTask(db, event.id, {
    title: 'Auth Matrix Task',
    category: 'pre_event',
  });

  const resource = await createResource(db, {
    name: 'Auth Matrix Resource',
    type: 'staff',
  });

  const communication = await createCommunication(db, event.id, client.id, {
    contactedBy: adminUser.id,
    type: 'email',
    subject: 'Auth Matrix Test',
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(17, 0, 0, 0);

  const scheduleEntry = await createResourceSchedule(
    db,
    resource.id,
    event.id,
    tomorrow,
    tomorrowEnd,
    { taskId: task.id }
  );

  return {
    adminUser: { id: adminUser.id, email: adminUser.email },
    managerUser: { id: managerUser.id, email: managerUser.email },
    clientUser: { id: clientUser.id, email: clientUser.email, clientId: client.id },
    client: { id: client.id, email: client.email },
    event: { id: event.id, client_id: event.client_id },
    completedEvent: { id: completedEvent.id },
    task: { id: task.id, event_id: task.event_id },
    resource: { id: resource.id },
    communication: { id: communication.id },
    scheduleEntry: { id: scheduleEntry.id },
  };
}

/**
 * Returns minimal valid input for any tRPC procedure.
 * Returns undefined for procedures that take no input.
 */
export function getProcedureInput(
  router: string,
  procedure: string,
  data: AuthMatrixData
): unknown {
  const key = `${router}.${procedure}`;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  tomorrow.setHours(9, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(17, 0, 0, 0);

  const dateFrom = new Date('2025-01-01');
  const dateTo = new Date('2027-12-31');

  const inputs: Record<string, unknown> = {
    // Event router
    'event.create': {
      clientId: data.client.id,
      eventName: 'Auth Test Event',
      eventDate: new Date('2026-09-15'),
    },
    'event.list': {},
    'event.getById': { id: data.event.id },
    'event.updateStatus': { id: data.event.id, newStatus: 'planning' },
    'event.update': { id: data.event.id, eventName: 'Updated Auth Event' },
    'event.archive': { id: data.completedEvent.id },

    // Task router
    'task.create': {
      eventId: data.event.id,
      title: 'Auth Test Task',
      category: 'pre_event',
    },
    'task.assign': { taskId: data.task.id, userId: data.managerUser.id },
    'task.assignResources': {
      taskId: data.task.id,
      resourceIds: [data.resource.id],
      startTime: tomorrow,
      endTime: tomorrowEnd,
      force: true,
    },
    'task.getAssignedResources': { taskId: data.task.id },
    'task.updateStatus': { id: data.task.id, newStatus: 'in_progress' },
    'task.listByEvent': { eventId: data.event.id },
    'task.getById': { id: data.task.id },
    'task.update': { id: data.task.id, title: 'Updated Auth Task' },
    'task.delete': { id: data.task.id },
    'task.getAssignableUsers': undefined,
    'task.getAvailableDependencies': { eventId: data.event.id },
    'task.markOverdueTasks': undefined,

    // Resource router
    'resource.create': { name: 'Auth Test Resource', type: 'staff' },
    'resource.list': {},
    'resource.getById': { id: data.resource.id },
    'resource.getSchedule': {
      resourceId: data.resource.id,
      startDate: dateFrom,
      endDate: dateTo,
    },
    'resource.checkConflicts': {
      resourceIds: [data.resource.id],
      startTime: tomorrow,
      endTime: tomorrowEnd,
    },
    'resource.update': { id: data.resource.id, name: 'Updated Auth Resource' },
    'resource.delete': { id: data.resource.id },
    'resource.getAvailable': {},
    'resource.schedulingServiceHealth': undefined,

    // Clients router
    'clients.list': undefined,
    'clients.getById': { id: data.client.id },
    'clients.create': {
      companyName: 'Auth Test Company',
      contactName: 'Auth Contact',
      email: `auth-test-${Date.now()}@test.com`,
    },
    'clients.update': { id: data.client.id, companyName: 'Updated Auth Company' },
    'clients.getClientEvents': { clientId: data.client.id },
    'clients.recordCommunication': {
      eventId: data.event.id,
      clientId: data.client.id,
      type: 'email',
    },
    'clients.listCommunications': { clientId: data.client.id },
    'clients.scheduleFollowUp': {
      communicationId: data.communication.id,
      followUpDate: new Date('2026-06-01'),
    },
    'clients.completeFollowUp': { communicationId: data.communication.id },
    'clients.getDueFollowUps': undefined,
    'clients.enablePortalAccess': {
      clientId: data.client.id,
      contactEmail: `portal-${Date.now()}@test.com`,
      sendWelcome: false,
    },
    'clients.disablePortalAccess': { clientId: data.client.id },
    'clients.getPortalUser': { clientId: data.client.id },

    // Analytics router
    'analytics.eventCompletion': { dateFrom, dateTo },
    'analytics.resourceUtilization': { dateFrom, dateTo },
    'analytics.taskPerformance': { dateFrom, dateTo },

    // User router
    'user.register': {
      name: 'Auth Test User',
      email: `register-${Date.now()}@test.com`,
      password: 'password123',
    },

    // Portal router
    'portal.requestMagicLink': { email: data.clientUser.email },
    'portal.getSummary': undefined,
    'portal.listEvents': {},
    'portal.getEvent': { eventId: data.event.id },
    'portal.getEventTimeline': { eventId: data.event.id },
    'portal.getEventTasks': { eventId: data.event.id },
    'portal.getEventCommunications': { eventId: data.event.id },
    'portal.getProfile': undefined,
  };

  return inputs[key];
}

/**
 * Access levels for tRPC procedures.
 */
export type AccessLevel = 'admin' | 'protected' | 'client' | 'public';

/**
 * Procedure definition for the auth matrix.
 */
export interface ProcedureDefinition {
  router: string;
  procedure: string;
  access: AccessLevel;
  type: 'query' | 'mutation' | 'subscription';
  skip?: string;
}

/**
 * Complete list of all tRPC procedures with their access levels.
 * Used to generate the authorization boundary matrix test.
 */
export const allProcedures: ProcedureDefinition[] = [
  // Event router - adminProcedure
  { router: 'event', procedure: 'create', access: 'admin', type: 'mutation' },
  { router: 'event', procedure: 'updateStatus', access: 'admin', type: 'mutation' },
  { router: 'event', procedure: 'update', access: 'admin', type: 'mutation' },
  { router: 'event', procedure: 'archive', access: 'admin', type: 'mutation' },
  // Event router - protectedProcedure
  { router: 'event', procedure: 'list', access: 'protected', type: 'query' },
  { router: 'event', procedure: 'getById', access: 'protected', type: 'query' },
  {
    router: 'event',
    procedure: 'onStatusChange',
    access: 'protected',
    type: 'subscription',
    skip: 'Subscriptions use different transport',
  },

  // Task router - adminProcedure
  { router: 'task', procedure: 'create', access: 'admin', type: 'mutation' },
  { router: 'task', procedure: 'assign', access: 'admin', type: 'mutation' },
  { router: 'task', procedure: 'assignResources', access: 'admin', type: 'mutation' },
  { router: 'task', procedure: 'update', access: 'admin', type: 'mutation' },
  { router: 'task', procedure: 'delete', access: 'admin', type: 'mutation' },
  { router: 'task', procedure: 'markOverdueTasks', access: 'admin', type: 'mutation' },
  // Task router - protectedProcedure
  { router: 'task', procedure: 'updateStatus', access: 'protected', type: 'mutation' },
  { router: 'task', procedure: 'listByEvent', access: 'protected', type: 'query' },
  { router: 'task', procedure: 'getById', access: 'protected', type: 'query' },
  { router: 'task', procedure: 'getAssignedResources', access: 'protected', type: 'query' },
  { router: 'task', procedure: 'getAssignableUsers', access: 'protected', type: 'query' },
  { router: 'task', procedure: 'getAvailableDependencies', access: 'protected', type: 'query' },
  {
    router: 'task',
    procedure: 'onUpdate',
    access: 'protected',
    type: 'subscription',
    skip: 'Subscriptions use different transport',
  },

  // Resource router - adminProcedure
  { router: 'resource', procedure: 'create', access: 'admin', type: 'mutation' },
  { router: 'resource', procedure: 'update', access: 'admin', type: 'mutation' },
  { router: 'resource', procedure: 'delete', access: 'admin', type: 'mutation' },
  // Resource router - protectedProcedure
  { router: 'resource', procedure: 'list', access: 'protected', type: 'query' },
  { router: 'resource', procedure: 'getById', access: 'protected', type: 'query' },
  { router: 'resource', procedure: 'getSchedule', access: 'protected', type: 'query' },
  { router: 'resource', procedure: 'checkConflicts', access: 'protected', type: 'query' },
  { router: 'resource', procedure: 'getAvailable', access: 'protected', type: 'query' },
  { router: 'resource', procedure: 'schedulingServiceHealth', access: 'protected', type: 'query' },

  // Clients router - adminProcedure
  { router: 'clients', procedure: 'create', access: 'admin', type: 'mutation' },
  { router: 'clients', procedure: 'update', access: 'admin', type: 'mutation' },
  { router: 'clients', procedure: 'recordCommunication', access: 'admin', type: 'mutation' },
  { router: 'clients', procedure: 'scheduleFollowUp', access: 'admin', type: 'mutation' },
  { router: 'clients', procedure: 'enablePortalAccess', access: 'admin', type: 'mutation' },
  { router: 'clients', procedure: 'disablePortalAccess', access: 'admin', type: 'mutation' },
  // Clients router - protectedProcedure
  { router: 'clients', procedure: 'list', access: 'protected', type: 'query' },
  { router: 'clients', procedure: 'getById', access: 'protected', type: 'query' },
  { router: 'clients', procedure: 'getClientEvents', access: 'protected', type: 'query' },
  { router: 'clients', procedure: 'listCommunications', access: 'protected', type: 'query' },
  { router: 'clients', procedure: 'completeFollowUp', access: 'protected', type: 'mutation' },
  { router: 'clients', procedure: 'getDueFollowUps', access: 'protected', type: 'query' },
  { router: 'clients', procedure: 'getPortalUser', access: 'protected', type: 'query' },

  // Analytics router - protectedProcedure
  { router: 'analytics', procedure: 'eventCompletion', access: 'protected', type: 'query' },
  { router: 'analytics', procedure: 'resourceUtilization', access: 'protected', type: 'query' },
  { router: 'analytics', procedure: 'taskPerformance', access: 'protected', type: 'query' },

  // User router - publicProcedure
  { router: 'user', procedure: 'register', access: 'public', type: 'mutation' },

  // Portal router - publicProcedure
  { router: 'portal', procedure: 'requestMagicLink', access: 'public', type: 'mutation' },
  // Portal router - clientProcedure
  { router: 'portal', procedure: 'getSummary', access: 'client', type: 'query' },
  { router: 'portal', procedure: 'listEvents', access: 'client', type: 'query' },
  { router: 'portal', procedure: 'getEvent', access: 'client', type: 'query' },
  { router: 'portal', procedure: 'getEventTimeline', access: 'client', type: 'query' },
  { router: 'portal', procedure: 'getEventTasks', access: 'client', type: 'query' },
  { router: 'portal', procedure: 'getEventCommunications', access: 'client', type: 'query' },
  { router: 'portal', procedure: 'getProfile', access: 'client', type: 'query' },
];
