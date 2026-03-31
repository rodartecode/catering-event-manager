import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import type { TestDatabase } from './db';

/**
 * Factory functions for creating test data.
 * Each factory returns the created record with its ID.
 */

// Counter for generating unique data
let counter = 0;
function nextId() {
  return ++counter;
}

// Reset counter (call in beforeEach)
export function resetFactoryCounter() {
  counter = 0;
}

/**
 * Create a test user.
 */
export async function createUser(
  db: TestDatabase,
  overrides: Partial<{
    email: string;
    name: string;
    role: 'administrator' | 'manager' | 'client';
    password: string;
    clientId: number;
    isActive: boolean;
  }> = {}
) {
  const id = nextId();
  // Client users don't have passwords (magic link auth)
  const passwordHash =
    overrides.role === 'client' ? null : await bcrypt.hash(overrides.password || 'password123', 10);

  const result = await db.execute(sql`
    INSERT INTO users (email, password_hash, name, role, client_id, is_active)
    VALUES (
      ${overrides.email || `user${id}@test.com`},
      ${passwordHash},
      ${overrides.name || `Test User ${id}`},
      ${overrides.role || 'manager'},
      ${overrides.clientId || null},
      ${overrides.isActive !== undefined ? overrides.isActive : true}
    )
    RETURNING id, email, name, role, client_id, is_active, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    email: string;
    name: string | null;
    role: 'administrator' | 'manager' | 'client';
    client_id: number | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test client.
 */
export async function createClient(
  db: TestDatabase,
  overrides: Partial<{
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    portalEnabled: boolean;
  }> = {}
) {
  const id = nextId();

  const result = await db.execute(sql`
    INSERT INTO clients (company_name, contact_name, email, phone, address, notes, portal_enabled, portal_enabled_at)
    VALUES (
      ${overrides.companyName || `Test Company ${id}`},
      ${overrides.contactName || `Contact ${id}`},
      ${overrides.email || `client${id}@test.com`},
      ${overrides.phone || null},
      ${overrides.address || null},
      ${overrides.notes || null},
      ${overrides.portalEnabled || false},
      ${overrides.portalEnabled ? new Date().toISOString() : null}
    )
    RETURNING id, company_name, contact_name, email, phone, address, notes, portal_enabled, portal_enabled_at, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    company_name: string;
    contact_name: string;
    email: string;
    phone: string | null;
    address: string | null;
    notes: string | null;
    portal_enabled: boolean;
    portal_enabled_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test event.
 */
export async function createEvent(
  db: TestDatabase,
  clientId: number,
  createdBy: number,
  overrides: Partial<{
    eventName: string;
    eventDate: Date;
    location: string;
    estimatedAttendees: number;
    notes: string;
    status: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up';
  }> = {}
) {
  const id = nextId();
  const eventDate = overrides.eventDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const result = await db.execute(sql`
    INSERT INTO events (client_id, event_name, event_date, location, estimated_attendees, notes, status, created_by)
    VALUES (
      ${clientId},
      ${overrides.eventName || `Test Event ${id}`},
      ${eventDate.toISOString().split('T')[0]},
      ${overrides.location || null},
      ${overrides.estimatedAttendees || null},
      ${overrides.notes || null},
      ${overrides.status || 'inquiry'},
      ${createdBy}
    )
    RETURNING id, client_id, event_name, event_date, location, estimated_attendees, notes, status, is_archived, created_by, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    client_id: number;
    event_name: string;
    event_date: Date;
    location: string | null;
    estimated_attendees: number | null;
    notes: string | null;
    status: string;
    is_archived: boolean;
    created_by: number;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test resource.
 */
export async function createResource(
  db: TestDatabase,
  overrides: Partial<{
    name: string;
    type: 'staff' | 'equipment' | 'materials';
    hourlyRate: number;
    isAvailable: boolean;
    notes: string;
  }> = {}
) {
  const id = nextId();

  const result = await db.execute(sql`
    INSERT INTO resources (name, type, hourly_rate, is_available, notes)
    VALUES (
      ${overrides.name || `Resource ${id}`},
      ${overrides.type || 'staff'},
      ${overrides.hourlyRate || null},
      ${overrides.isAvailable !== undefined ? overrides.isAvailable : true},
      ${overrides.notes || null}
    )
    RETURNING id, name, type, hourly_rate, is_available, notes, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    name: string;
    type: string;
    hourly_rate: number | null;
    is_available: boolean;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test task.
 */
export async function createTask(
  db: TestDatabase,
  eventId: number,
  overrides: Partial<{
    title: string;
    description: string;
    category: 'pre_event' | 'during_event' | 'post_event';
    status: 'pending' | 'in_progress' | 'completed';
    dueDate: Date;
    dependsOnTaskId: number;
    assignedTo: number;
  }> = {}
) {
  const id = nextId();

  const result = await db.execute(sql`
    INSERT INTO tasks (event_id, title, description, category, status, due_date, depends_on_task_id, assigned_to)
    VALUES (
      ${eventId},
      ${overrides.title || `Task ${id}`},
      ${overrides.description || null},
      ${overrides.category || 'pre_event'},
      ${overrides.status || 'pending'},
      ${overrides.dueDate?.toISOString() || null},
      ${overrides.dependsOnTaskId || null},
      ${overrides.assignedTo || null}
    )
    RETURNING id, event_id, title, description, category, status, due_date, depends_on_task_id, assigned_to, is_overdue, completed_at, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    event_id: number;
    title: string;
    description: string | null;
    category: string;
    status: string;
    due_date: Date | null;
    depends_on_task_id: number | null;
    assigned_to: number | null;
    is_overdue: boolean;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a resource schedule entry.
 */
export async function createResourceSchedule(
  db: TestDatabase,
  resourceId: number,
  eventId: number,
  startTime: Date,
  endTime: Date,
  overrides: Partial<{
    taskId: number;
    notes: string;
  }> = {}
) {
  const result = await db.execute(sql`
    INSERT INTO resource_schedule (resource_id, event_id, task_id, start_time, end_time, notes)
    VALUES (
      ${resourceId},
      ${eventId},
      ${overrides.taskId || null},
      ${startTime.toISOString()},
      ${endTime.toISOString()},
      ${overrides.notes || null}
    )
    RETURNING id, resource_id, event_id, task_id, start_time, end_time, notes, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    resource_id: number;
    event_id: number;
    task_id: number | null;
    start_time: Date;
    end_time: Date;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a communication record.
 * Requires eventId since it's NOT NULL in the schema.
 */
export async function createCommunication(
  db: TestDatabase,
  eventId: number,
  clientId: number,
  overrides: Partial<{
    contactedBy: number;
    type: 'email' | 'phone' | 'meeting' | 'other';
    subject: string;
    notes: string;
    contactedAt: Date;
    followUpDate: Date;
    followUpCompleted: boolean;
  }> = {}
) {
  const result = await db.execute(sql`
    INSERT INTO communications (event_id, client_id, contacted_by, type, subject, notes, contacted_at, follow_up_date, follow_up_completed)
    VALUES (
      ${eventId},
      ${clientId},
      ${overrides.contactedBy || null},
      ${overrides.type || 'email'},
      ${overrides.subject || null},
      ${overrides.notes || null},
      ${(overrides.contactedAt || new Date()).toISOString()},
      ${overrides.followUpDate?.toISOString() || null},
      ${overrides.followUpCompleted || false}
    )
    RETURNING id, event_id, client_id, contacted_by, type, subject, notes, contacted_at, follow_up_date, follow_up_completed, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    event_id: number;
    client_id: number;
    contacted_by: number | null;
    type: string;
    subject: string | null;
    notes: string | null;
    contacted_at: Date;
    follow_up_date: Date | null;
    follow_up_completed: boolean;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test document.
 */
export async function createDocument(
  db: TestDatabase,
  eventId: number,
  uploadedBy: number,
  overrides: Partial<{
    name: string;
    type: 'contract' | 'menu' | 'floor_plan' | 'permit' | 'photo';
    storageKey: string;
    fileSize: number;
    mimeType: string;
    sharedWithClient: boolean;
  }> = {}
) {
  const id = nextId();

  const result = await db.execute(sql`
    INSERT INTO documents (event_id, name, type, storage_key, file_size, mime_type, shared_with_client, uploaded_by)
    VALUES (
      ${eventId},
      ${overrides.name || `Document ${id}`},
      ${overrides.type || 'contract'},
      ${overrides.storageKey || `events/${eventId}/${id}/file.pdf`},
      ${overrides.fileSize || 1024},
      ${overrides.mimeType || 'application/pdf'},
      ${overrides.sharedWithClient || false},
      ${uploadedBy}
    )
    RETURNING id, event_id, name, type, storage_key, file_size, mime_type, shared_with_client, uploaded_by, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    event_id: number;
    name: string;
    type: string;
    storage_key: string;
    file_size: number;
    mime_type: string;
    shared_with_client: boolean;
    uploaded_by: number;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test expense.
 */
export async function createExpense(
  db: TestDatabase,
  eventId: number,
  createdBy: number,
  overrides: Partial<{
    category:
      | 'labor'
      | 'food_supplies'
      | 'equipment_rental'
      | 'venue'
      | 'transportation'
      | 'decor'
      | 'beverages'
      | 'other';
    description: string;
    amount: string;
    vendor: string;
    expenseDate: Date;
    notes: string;
  }> = {}
) {
  const id = nextId();

  const result = await db.execute(sql`
    INSERT INTO expenses (event_id, category, description, amount, vendor, expense_date, notes, created_by)
    VALUES (
      ${eventId},
      ${overrides.category || 'food_supplies'},
      ${overrides.description || `Expense ${id}`},
      ${overrides.amount || '100.00'},
      ${overrides.vendor || null},
      ${(overrides.expenseDate || new Date()).toISOString()},
      ${overrides.notes || null},
      ${createdBy}
    )
    RETURNING id, event_id, category, description, amount, vendor, expense_date, notes, created_by, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    event_id: number;
    category: string;
    description: string;
    amount: string;
    vendor: string | null;
    expense_date: Date;
    notes: string | null;
    created_by: number;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test invoice.
 */
export async function createInvoice(
  db: TestDatabase,
  eventId: number,
  createdBy: number,
  overrides: Partial<{
    invoiceNumber: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    subtotal: string;
    taxRate: string;
    taxAmount: string;
    total: string;
    notes: string;
    dueDate: Date;
    sentAt: Date;
  }> = {}
) {
  const id = nextId();

  const result = await db.execute(sql`
    INSERT INTO invoices (event_id, invoice_number, status, subtotal, tax_rate, tax_amount, total, notes, due_date, sent_at, created_by)
    VALUES (
      ${eventId},
      ${overrides.invoiceNumber || `INV-TEST-${id.toString().padStart(3, '0')}`},
      ${overrides.status || 'draft'},
      ${overrides.subtotal || '0.00'},
      ${overrides.taxRate || '0.0000'},
      ${overrides.taxAmount || '0.00'},
      ${overrides.total || '0.00'},
      ${overrides.notes || null},
      ${overrides.dueDate?.toISOString() || null},
      ${overrides.sentAt?.toISOString() || null},
      ${createdBy}
    )
    RETURNING id, event_id, invoice_number, status, subtotal, tax_rate, tax_amount, total, notes, due_date, sent_at, created_by, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    event_id: number;
    invoice_number: string;
    status: string;
    subtotal: string;
    tax_rate: string;
    tax_amount: string;
    total: string;
    notes: string | null;
    due_date: Date | null;
    sent_at: Date | null;
    created_by: number;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test invoice line item.
 */
export async function createInvoiceLineItem(
  db: TestDatabase,
  invoiceId: number,
  overrides: Partial<{
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
    sortOrder: number;
  }> = {}
) {
  const id = nextId();
  const quantity = overrides.quantity || '1.00';
  const unitPrice = overrides.unitPrice || '100.00';
  const amount = overrides.amount || (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2);

  const result = await db.execute(sql`
    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, amount, sort_order)
    VALUES (
      ${invoiceId},
      ${overrides.description || `Line Item ${id}`},
      ${quantity},
      ${unitPrice},
      ${amount},
      ${overrides.sortOrder ?? 0}
    )
    RETURNING id, invoice_id, description, quantity, unit_price, amount, sort_order, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    invoice_id: number;
    description: string;
    quantity: string;
    unit_price: string;
    amount: string;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test payment.
 */
export async function createPayment(
  db: TestDatabase,
  invoiceId: number,
  recordedBy: number,
  overrides: Partial<{
    amount: string;
    method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
    paymentDate: Date;
    reference: string;
    notes: string;
  }> = {}
) {
  const result = await db.execute(sql`
    INSERT INTO payments (invoice_id, amount, method, payment_date, reference, notes, recorded_by)
    VALUES (
      ${invoiceId},
      ${overrides.amount || '100.00'},
      ${overrides.method || 'bank_transfer'},
      ${(overrides.paymentDate || new Date()).toISOString()},
      ${overrides.reference || null},
      ${overrides.notes || null},
      ${recordedBy}
    )
    RETURNING id, invoice_id, amount, method, payment_date, reference, notes, recorded_by, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    invoice_id: number;
    amount: string;
    method: string;
    payment_date: Date;
    reference: string | null;
    notes: string | null;
    recorded_by: number;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test menu item (global catalog).
 */
export async function createMenuItem(
  db: TestDatabase,
  createdBy: number,
  overrides: Partial<{
    name: string;
    description: string;
    costPerPerson: string;
    category: 'appetizer' | 'main' | 'side' | 'dessert' | 'beverage';
    allergens: string[];
    dietaryTags: string[];
    isActive: boolean;
  }> = {}
) {
  const id = nextId();

  const result = await db.execute(sql`
    INSERT INTO menu_items (name, description, cost_per_person, category, allergens, dietary_tags, is_active, created_by)
    VALUES (
      ${overrides.name || `Menu Item ${id}`},
      ${overrides.description || null},
      ${overrides.costPerPerson || '10.00'},
      ${overrides.category || 'main'},
      ${overrides.allergens ? `{${overrides.allergens.join(',')}}` : '{}'},
      ${overrides.dietaryTags ? `{${overrides.dietaryTags.join(',')}}` : '{}'},
      ${overrides.isActive !== undefined ? overrides.isActive : true},
      ${createdBy}
    )
    RETURNING id, name, description, cost_per_person, category, allergens, dietary_tags, is_active, created_by, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    name: string;
    description: string | null;
    cost_per_person: string;
    category: string;
    allergens: string[];
    dietary_tags: string[];
    is_active: boolean;
    created_by: number;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test event menu (named menu grouping for an event).
 */
export async function createEventMenu(
  db: TestDatabase,
  eventId: number,
  overrides: Partial<{
    name: string;
    notes: string;
    sortOrder: number;
  }> = {}
) {
  const id = nextId();

  const result = await db.execute(sql`
    INSERT INTO event_menus (event_id, name, notes, sort_order)
    VALUES (
      ${eventId},
      ${overrides.name || `Menu ${id}`},
      ${overrides.notes || null},
      ${overrides.sortOrder ?? 0}
    )
    RETURNING id, event_id, name, notes, sort_order, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    event_id: number;
    name: string;
    notes: string | null;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Create a test event menu item (junction between event menu and menu item).
 */
export async function createEventMenuItem(
  db: TestDatabase,
  eventMenuId: number,
  menuItemId: number,
  overrides: Partial<{
    quantityOverride: number;
    notes: string;
    sortOrder: number;
  }> = {}
) {
  const result = await db.execute(sql`
    INSERT INTO event_menu_items (event_menu_id, menu_item_id, quantity_override, notes, sort_order)
    VALUES (
      ${eventMenuId},
      ${menuItemId},
      ${overrides.quantityOverride || null},
      ${overrides.notes || null},
      ${overrides.sortOrder ?? 0}
    )
    RETURNING id, event_menu_id, menu_item_id, quantity_override, notes, sort_order, created_at
  `);

  return result[0] as {
    id: number;
    event_menu_id: number;
    menu_item_id: number;
    quantity_override: number | null;
    notes: string | null;
    sort_order: number;
    created_at: Date;
  };
}

/**
 * Create a test notification.
 */
export async function createNotification(
  db: TestDatabase,
  userId: number,
  overrides: Partial<{
    type: 'task_assigned' | 'status_changed' | 'overdue' | 'follow_up_due';
    title: string;
    body: string;
    readAt: Date;
    entityType: string;
    entityId: number;
  }> = {}
) {
  const id = nextId();

  const result = await db.execute(sql`
    INSERT INTO notifications (user_id, type, title, body, read_at, entity_type, entity_id)
    VALUES (
      ${userId},
      ${overrides.type || 'task_assigned'},
      ${overrides.title || `Notification ${id}`},
      ${overrides.body || null},
      ${overrides.readAt?.toISOString() || null},
      ${overrides.entityType || null},
      ${overrides.entityId || null}
    )
    RETURNING id, user_id, type, title, body, read_at, entity_type, entity_id, created_at, updated_at
  `);

  return result[0] as {
    id: number;
    user_id: number;
    type: string;
    title: string;
    body: string | null;
    read_at: Date | null;
    entity_type: string | null;
    entity_id: number | null;
    created_at: Date;
    updated_at: Date;
  };
}

/**
 * Convenience: Create a client with an event.
 * Creates a user automatically to satisfy the created_by requirement.
 */
export async function createClientWithEvent(
  db: TestDatabase,
  eventOverrides: Parameters<typeof createEvent>[3] = {}
) {
  const user = await createUser(db, { role: 'administrator' });
  const client = await createClient(db);
  const event = await createEvent(db, client.id, user.id, eventOverrides);
  return { client, event, user };
}

/**
 * Convenience: Create a full event setup with client, event, and tasks.
 * Creates a user automatically to satisfy the created_by requirement.
 */
export async function createFullEventSetup(
  db: TestDatabase,
  options: {
    taskCount?: number;
    resourceCount?: number;
  } = {}
) {
  const { taskCount = 2, resourceCount = 1 } = options;

  const user = await createUser(db, { role: 'administrator' });
  const client = await createClient(db);
  const event = await createEvent(db, client.id, user.id);

  const tasks = await Promise.all(
    Array.from({ length: taskCount }, () => createTask(db, event.id))
  );

  const resources = await Promise.all(
    Array.from({ length: resourceCount }, () => createResource(db))
  );

  return { client, event, tasks, resources, user };
}

/**
 * Convenience: Create a client with portal access enabled.
 * Creates a client with portal enabled and a client user linked to it.
 */
export async function createClientWithPortal(
  db: TestDatabase,
  overrides: Partial<{
    companyName: string;
    contactName: string;
    email: string;
    userEmail: string;
  }> = {}
) {
  const client = await createClient(db, {
    companyName: overrides.companyName,
    contactName: overrides.contactName,
    email: overrides.email,
    portalEnabled: true,
  });

  const portalUser = await createUser(db, {
    email: overrides.userEmail || client.email,
    name: client.contact_name,
    role: 'client',
    clientId: client.id,
    isActive: true,
  });

  return { client, portalUser };
}

/**
 * Create an archived event.
 * Creates a completed event and then marks it as archived via raw SQL.
 */
export async function createArchivedEvent(
  db: TestDatabase,
  clientId: number,
  createdBy: number,
  archivedBy?: number,
  overrides: Partial<{
    eventName: string;
    eventDate: Date;
    location: string;
    estimatedAttendees: number;
    notes: string;
  }> = {}
) {
  const event = await createEvent(db, clientId, createdBy, {
    ...overrides,
    status: 'completed',
  });

  const archivedById = archivedBy || createdBy;
  const now = new Date().toISOString();

  await db.execute(sql`
    UPDATE events
    SET is_archived = true, archived_at = ${now}, archived_by = ${archivedById}
    WHERE id = ${event.id}
  `);

  return {
    ...event,
    status: 'completed',
    is_archived: true,
    archived_by: archivedById,
  };
}

/**
 * Create an event status log entry.
 */
export async function createEventStatusLog(
  db: TestDatabase,
  eventId: number,
  changedBy: number,
  overrides: Partial<{
    oldStatus:
      | 'inquiry'
      | 'planning'
      | 'preparation'
      | 'in_progress'
      | 'completed'
      | 'follow_up'
      | null;
    newStatus: 'inquiry' | 'planning' | 'preparation' | 'in_progress' | 'completed' | 'follow_up';
    notes: string;
  }> = {}
) {
  const result = await db.execute(sql`
    INSERT INTO event_status_log (event_id, old_status, new_status, changed_by, notes)
    VALUES (
      ${eventId},
      ${overrides.oldStatus ?? null},
      ${overrides.newStatus || 'inquiry'},
      ${changedBy},
      ${overrides.notes || null}
    )
    RETURNING id, event_id, old_status, new_status, changed_by, notes, changed_at
  `);

  return result[0] as {
    id: number;
    event_id: number;
    old_status: string | null;
    new_status: string;
    changed_by: number;
    notes: string | null;
    changed_at: Date;
  };
}

/**
 * Create a communication with a follow-up date.
 * Convenience wrapper that sets followUpDate and followUpCompleted: false.
 */
export async function createCommunicationWithFollowUp(
  db: TestDatabase,
  eventId: number,
  clientId: number,
  contactedBy: number,
  overrides: Partial<{
    type: 'email' | 'phone' | 'meeting' | 'other';
    subject: string;
    notes: string;
    contactedAt: Date;
    followUpDate: Date;
  }> = {}
) {
  return createCommunication(db, eventId, clientId, {
    contactedBy,
    type: overrides.type,
    subject: overrides.subject,
    notes: overrides.notes,
    contactedAt: overrides.contactedAt,
    followUpDate: overrides.followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    followUpCompleted: false,
  });
}

/**
 * Create a full test data set with all entity types.
 * Seeds: admin, manager, client, event (with status logs), 3 tasks (dependency chain),
 * 2 resources, 1 schedule entry, 1 communication with follow-up.
 */
export async function createFullTestData(db: TestDatabase) {
  const admin = await createUser(db, { role: 'administrator', name: 'Full Data Admin' });
  const manager = await createUser(db, { role: 'manager', name: 'Full Data Manager' });
  const client = await createClient(db, { companyName: 'Full Test Corp' });
  const event = await createEvent(db, client.id, admin.id, {
    eventName: 'Full Test Event',
    status: 'planning',
  });

  // Create status logs
  await createEventStatusLog(db, event.id, admin.id, {
    oldStatus: null,
    newStatus: 'inquiry',
  });
  await createEventStatusLog(db, event.id, admin.id, {
    oldStatus: 'inquiry',
    newStatus: 'planning',
  });

  // Create task dependency chain: A (no deps) -> B (depends on A) -> C (depends on B)
  const taskA = await createTask(db, event.id, {
    title: 'Task A - Foundation',
    category: 'pre_event',
  });
  const taskB = await createTask(db, event.id, {
    title: 'Task B - Depends on A',
    category: 'pre_event',
    dependsOnTaskId: taskA.id,
  });
  const taskC = await createTask(db, event.id, {
    title: 'Task C - Depends on B',
    category: 'during_event',
    dependsOnTaskId: taskB.id,
  });

  // Create resources
  const staffResource = await createResource(db, {
    name: 'Head Chef',
    type: 'staff',
    hourlyRate: 75,
  });
  const equipmentResource = await createResource(db, {
    name: 'Portable Oven',
    type: 'equipment',
    hourlyRate: 25,
  });

  // Create schedule entry
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(17, 0, 0, 0);

  const scheduleEntry = await createResourceSchedule(
    db,
    staffResource.id,
    event.id,
    tomorrow,
    tomorrowEnd,
    { taskId: taskA.id }
  );

  // Create communication with follow-up
  const communication = await createCommunicationWithFollowUp(db, event.id, client.id, admin.id, {
    type: 'email',
    subject: 'Initial Planning Discussion',
    followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  });

  return {
    admin,
    manager,
    client,
    event,
    tasks: { taskA, taskB, taskC },
    resources: { staffResource, equipmentResource },
    scheduleEntry,
    communication,
  };
}

/**
 * Convenience: Create a full portal test setup.
 * Creates a client with portal access and events with tasks and communications.
 */
export async function createPortalTestSetup(
  db: TestDatabase,
  options: {
    eventCount?: number;
    taskCount?: number;
  } = {}
) {
  const { eventCount = 1, taskCount = 2 } = options;

  // Create admin for event creation
  const adminUser = await createUser(db, { role: 'administrator' });

  // Create client with portal access
  const { client, portalUser } = await createClientWithPortal(db);

  // Create events with tasks
  const events = await Promise.all(
    Array.from({ length: eventCount }, async () => {
      const event = await createEvent(db, client.id, adminUser.id);
      const tasks = await Promise.all(
        Array.from({ length: taskCount }, () => createTask(db, event.id))
      );
      return { event, tasks };
    })
  );

  return {
    client,
    portalUser,
    adminUser,
    events: events.map((e) => e.event),
    tasks: events.flatMap((e) => e.tasks),
  };
}
