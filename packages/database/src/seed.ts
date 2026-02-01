/**
 * Database Seed Script
 *
 * Seeds the database with sample data for development and testing.
 * Run: pnpm db:seed (from packages/database or root)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import {
  users,
  clients,
  events,
  tasks,
  resources,
  communications,
} from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is not set');
  console.error('Example: DATABASE_URL="postgresql://admin:changeme@localhost:5432/catering_events"');
  process.exit(1);
}

// Password hashing using bcrypt to match NextAuth's bcrypt.compare()
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function seed() {
  console.log('🌱 Starting database seed...\n');

  const client = postgres(connectionString!, { max: 1 });
  const db = drizzle(client);

  try {
    // =====================
    // 1. SEED CLIENTS
    // =====================
    console.log('📋 Creating clients...');

    const clientData = [
      {
        companyName: 'Acme Corporation',
        contactName: 'Jane Smith',
        email: 'jane.smith@acme.test',
        phone: '555-0101',
        address: '123 Business Ave, Suite 100, New York, NY 10001',
        notes: 'Long-term client, prefers organic options',
        portalEnabled: true,
        portalEnabledAt: new Date(),
      },
      {
        companyName: 'TechStart Inc',
        contactName: 'Michael Chen',
        email: 'michael@techstart.test',
        phone: '555-0102',
        address: '456 Innovation Blvd, San Francisco, CA 94102',
        notes: 'Startup company, budget-conscious but values quality',
        portalEnabled: true,
        portalEnabledAt: new Date(),
      },
      {
        companyName: 'Green Valley Weddings',
        contactName: 'Sarah Johnson',
        email: 'sarah@greenvalley.test',
        phone: '555-0103',
        address: '789 Garden Lane, Austin, TX 78701',
        notes: 'Wedding planner, refers multiple clients per year',
        portalEnabled: false,
      },
    ];

    const insertedClients = await db.insert(clients).values(clientData).returning();
    console.log(`   ✓ Created ${insertedClients.length} clients`);

    // =====================
    // 2. SEED USERS
    // =====================
    console.log('👤 Creating users...');

    // Hash passwords before building user array
    const adminPasswordHash = await hashPassword('password123');
    const managerPasswordHash = await hashPassword('password123');

    const userData = [
      {
        email: 'admin@example.com',
        passwordHash: adminPasswordHash,
        name: 'Admin User',
        role: 'administrator' as const,
        isActive: true,
      },
      {
        email: 'manager@example.com',
        passwordHash: managerPasswordHash,
        name: 'Event Manager',
        role: 'manager' as const,
        isActive: true,
      },
      {
        // Portal user linked to first client
        email: 'jane.smith@acme.test',
        passwordHash: null, // Magic link only
        name: 'Jane Smith',
        role: 'client' as const,
        clientId: insertedClients[0].id,
        isActive: true,
      },
      {
        // Portal user linked to second client
        email: 'michael@techstart.test',
        passwordHash: null, // Magic link only
        name: 'Michael Chen',
        role: 'client' as const,
        clientId: insertedClients[1].id,
        isActive: true,
      },
    ];

    const insertedUsers = await db.insert(users).values(userData).returning();
    const adminUser = insertedUsers[0];
    const managerUser = insertedUsers[1];
    console.log(`   ✓ Created ${insertedUsers.length} users`);

    // =====================
    // 3. SEED EVENTS
    // =====================
    console.log('🎉 Creating events...');

    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const eventData = [
      {
        clientId: insertedClients[0].id,
        eventName: 'Acme Annual Gala 2026',
        eventDate: new Date(now.getTime() + oneMonth),
        location: 'Grand Ballroom, Hilton NYC',
        status: 'planning' as const,
        estimatedAttendees: 250,
        notes: 'Black-tie event, need premium catering package',
        createdBy: adminUser.id,
      },
      {
        clientId: insertedClients[0].id,
        eventName: 'Acme Board Meeting Lunch',
        eventDate: new Date(now.getTime() + oneWeek),
        location: 'Acme HQ Conference Room',
        status: 'preparation' as const,
        estimatedAttendees: 15,
        notes: 'Executive lunch, vegetarian options required',
        createdBy: adminUser.id,
      },
      {
        clientId: insertedClients[1].id,
        eventName: 'TechStart Product Launch',
        eventDate: new Date(now.getTime() + 2 * oneWeek),
        location: 'Tech Hub, SF',
        status: 'inquiry' as const,
        estimatedAttendees: 100,
        notes: 'Cocktail reception style, tech-themed appetizers',
        createdBy: managerUser.id,
      },
      {
        clientId: insertedClients[2].id,
        eventName: 'Johnson-Williams Wedding',
        eventDate: new Date(now.getTime() + 3 * oneMonth),
        location: 'Green Valley Estate',
        status: 'planning' as const,
        estimatedAttendees: 180,
        notes: 'Farm-to-table menu, local wine pairing',
        createdBy: adminUser.id,
      },
      {
        clientId: insertedClients[1].id,
        eventName: 'TechStart Holiday Party 2025',
        eventDate: new Date(now.getTime() - oneWeek),
        location: 'TechStart Office',
        status: 'completed' as const,
        estimatedAttendees: 50,
        notes: 'Completed successfully, client very satisfied',
        createdBy: managerUser.id,
      },
    ];

    const insertedEvents = await db.insert(events).values(eventData).returning();
    console.log(`   ✓ Created ${insertedEvents.length} events`);

    // =====================
    // 4. SEED RESOURCES
    // =====================
    console.log('🛠️ Creating resources...');

    const resourceData = [
      {
        name: 'Chef Marcus',
        type: 'staff' as const,
        hourlyRate: '75.00',
        isAvailable: true,
        notes: 'Head chef, specializes in French cuisine',
      },
      {
        name: 'Server Team A',
        type: 'staff' as const,
        hourlyRate: '25.00',
        isAvailable: true,
        notes: '5-person server team for large events',
      },
      {
        name: 'Commercial Oven (Large)',
        type: 'equipment' as const,
        hourlyRate: '50.00',
        isAvailable: true,
        notes: 'Portable commercial oven for off-site events',
      },
      {
        name: 'Beverage Station Kit',
        type: 'equipment' as const,
        hourlyRate: '30.00',
        isAvailable: true,
        notes: 'Includes dispensers, ice bins, glassware',
      },
      {
        name: 'Premium Tableware Set',
        type: 'materials' as const,
        hourlyRate: null,
        isAvailable: true,
        notes: 'Elegant china, silverware, crystal glasses - 200 place settings',
      },
    ];

    const insertedResources = await db.insert(resources).values(resourceData).returning();
    console.log(`   ✓ Created ${insertedResources.length} resources`);

    // =====================
    // 5. SEED TASKS
    // =====================
    console.log('✅ Creating tasks...');

    const galaEvent = insertedEvents[0];
    const boardLunchEvent = insertedEvents[1];

    const taskData = [
      // Tasks for Acme Annual Gala
      {
        eventId: galaEvent.id,
        title: 'Finalize menu selection',
        description: 'Work with client to finalize appetizers, main courses, and desserts',
        category: 'pre_event' as const,
        status: 'in_progress' as const,
        assignedTo: adminUser.id,
        dueDate: new Date(now.getTime() + oneWeek),
      },
      {
        eventId: galaEvent.id,
        title: 'Confirm venue requirements',
        description: 'Verify kitchen access, power requirements, and setup times',
        category: 'pre_event' as const,
        status: 'pending' as const,
        assignedTo: managerUser.id,
        dueDate: new Date(now.getTime() + 2 * oneWeek),
      },
      {
        eventId: galaEvent.id,
        title: 'Order specialty ingredients',
        description: 'Source organic produce and specialty items for premium menu',
        category: 'pre_event' as const,
        status: 'pending' as const,
        assignedTo: adminUser.id,
        dueDate: new Date(now.getTime() + 3 * oneWeek),
      },
      {
        eventId: galaEvent.id,
        title: 'Setup catering stations',
        description: 'Arrive 4 hours early to set up all food stations',
        category: 'during_event' as const,
        status: 'pending' as const,
        assignedTo: managerUser.id,
        dueDate: new Date(galaEvent.eventDate.getTime() - 4 * 60 * 60 * 1000),
      },
      {
        eventId: galaEvent.id,
        title: 'Send thank you note',
        description: 'Follow up with client after event',
        category: 'post_event' as const,
        status: 'pending' as const,
        assignedTo: adminUser.id,
        dueDate: new Date(galaEvent.eventDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
      // Tasks for Board Meeting Lunch
      {
        eventId: boardLunchEvent.id,
        title: 'Prep executive lunch menu',
        description: 'Prepare salmon, salads, and vegetarian options',
        category: 'pre_event' as const,
        status: 'completed' as const,
        assignedTo: adminUser.id,
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        completedAt: new Date(),
      },
      {
        eventId: boardLunchEvent.id,
        title: 'Delivery and setup',
        description: 'Deliver lunch to Acme HQ by 11:30 AM',
        category: 'during_event' as const,
        status: 'in_progress' as const,
        assignedTo: managerUser.id,
        dueDate: boardLunchEvent.eventDate,
      },
      {
        eventId: boardLunchEvent.id,
        title: 'Collect feedback',
        description: 'Get feedback from assistant after meeting',
        category: 'post_event' as const,
        status: 'pending' as const,
        assignedTo: managerUser.id,
        dueDate: new Date(boardLunchEvent.eventDate.getTime() + 24 * 60 * 60 * 1000),
      },
      // Additional tasks for variety
      {
        eventId: insertedEvents[2].id,
        title: 'Initial consultation call',
        description: 'Discuss menu options and budget with TechStart',
        category: 'pre_event' as const,
        status: 'pending' as const,
        assignedTo: adminUser.id,
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        eventId: insertedEvents[3].id,
        title: 'Wedding tasting session',
        description: 'Schedule tasting for bride and groom',
        category: 'pre_event' as const,
        status: 'pending' as const,
        assignedTo: adminUser.id,
        dueDate: new Date(now.getTime() + 2 * oneWeek),
      },
    ];

    const insertedTasks = await db.insert(tasks).values(taskData).returning();
    console.log(`   ✓ Created ${insertedTasks.length} tasks`);

    // =====================
    // 6. SEED COMMUNICATIONS
    // =====================
    console.log('💬 Creating communications...');

    const communicationData = [
      {
        eventId: galaEvent.id,
        clientId: insertedClients[0].id,
        type: 'email' as const,
        subject: 'Gala Menu Options',
        notes: 'Sent initial menu proposals with three tier options',
        contactedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        contactedBy: adminUser.id,
        followUpDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        followUpCompleted: false,
      },
      {
        eventId: galaEvent.id,
        clientId: insertedClients[0].id,
        type: 'phone' as const,
        subject: 'Budget Discussion',
        notes: 'Client approved premium tier, confirmed budget of $25,000',
        contactedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        contactedBy: adminUser.id,
        followUpDate: null,
        followUpCompleted: false,
      },
      {
        eventId: boardLunchEvent.id,
        clientId: insertedClients[0].id,
        type: 'email' as const,
        subject: 'Board Lunch Confirmation',
        notes: 'Confirmed attendee count and dietary restrictions',
        contactedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        contactedBy: managerUser.id,
        followUpDate: null,
        followUpCompleted: false,
      },
      {
        eventId: insertedEvents[2].id,
        clientId: insertedClients[1].id,
        type: 'meeting' as const,
        subject: 'Initial Consultation',
        notes: 'Met with Michael to discuss product launch catering needs',
        contactedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        contactedBy: managerUser.id,
        followUpDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        followUpCompleted: false,
      },
      {
        eventId: insertedEvents[4].id,
        clientId: insertedClients[1].id,
        type: 'email' as const,
        subject: 'Thank You - Holiday Party',
        notes: 'Sent thank you email and feedback request after successful event',
        contactedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        contactedBy: managerUser.id,
        followUpDate: null,
        followUpCompleted: true,
      },
    ];

    const insertedComms = await db.insert(communications).values(communicationData).returning();
    console.log(`   ✓ Created ${insertedComms.length} communications`);

    // =====================
    // SUMMARY
    // =====================
    console.log('\n✨ Seed completed successfully!\n');
    console.log('Summary:');
    console.log(`   - ${insertedClients.length} clients`);
    console.log(`   - ${insertedUsers.length} users (admin@example.com / password123)`);
    console.log(`   - ${insertedEvents.length} events`);
    console.log(`   - ${insertedResources.length} resources`);
    console.log(`   - ${insertedTasks.length} tasks`);
    console.log(`   - ${insertedComms.length} communications`);
    console.log('\n📝 Login credentials:');
    console.log('   Admin: admin@example.com / password123');
    console.log('   Manager: manager@example.com / password123');
    console.log('   Portal: jane.smith@acme.test (magic link)\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run seed
seed();
