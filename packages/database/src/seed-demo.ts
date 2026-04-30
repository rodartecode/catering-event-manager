/**
 * Demo Seed Script
 *
 * Wipes the database and reseeds it with rich demo data designed to
 * showcase the latest features (vendor management, kitchen production,
 * venues, staff skills, drag-drop scheduling, menus, financials).
 *
 * Used in two contexts:
 *  1. Manual: `pnpm db:seed:demo` from packages/database (or root)
 *  2. Cron: `/api/cron/reset-demo` calls `seedDemo()` weekly on the demo env.
 *
 * Hard guards: refuses to run unless DEMO_RESET_ALLOWED=true to prevent
 * an accidental run against staging/prod.
 */

import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  clients,
  communications,
  eventMenuItems,
  eventMenus,
  events,
  eventVendors,
  expenses,
  invoiceLineItems,
  invoices,
  kitchenStations,
  menuItems,
  productionTasks,
  resourceSchedule,
  resources,
  staffAvailability,
  staffSkills,
  tasks,
  taskTemplateItems,
  taskTemplates,
  users,
  vendors,
  venues,
} from './schema';
import { allTemplates } from './seed-templates';

const TABLES_IN_TRUNCATE_ORDER = [
  // Tables are TRUNCATE ... CASCADE'd, so order is just for readability.
  'verification_tokens',
  'portal_access_log',
  'notification_preferences',
  'notifications',
  'payments',
  'invoice_line_items',
  'invoices',
  'expenses',
  'production_tasks',
  'kitchen_stations',
  'event_menu_items',
  'event_menus',
  'menu_items',
  'event_vendors',
  'vendors',
  'staff_availability',
  'staff_skills',
  'task_resources',
  'resource_schedule',
  'resources',
  'communications',
  'documents',
  'event_status_log',
  'tasks',
  'events',
  'venues',
  'task_template_items',
  'task_templates',
  'users',
  'clients',
];

export interface SeedDemoResult {
  clients: number;
  users: number;
  venues: number;
  vendors: number;
  menuItems: number;
  kitchenStations: number;
  events: number;
  tasks: number;
  productionTasks: number;
  resourceScheduleBlocks: number;
  expenses: number;
  invoices: number;
  eventVendors: number;
  taskTemplates: number;
}

/**
 * Wipes all application data and reseeds with demo content.
 * Caller is responsible for guard checks (DEMO_RESET_ALLOWED, env, etc).
 */
export async function seedDemo(connectionString: string): Promise<SeedDemoResult> {
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    // -----------------------------------------------------------------
    // 0. WIPE
    // -----------------------------------------------------------------
    // Single TRUNCATE statement so PG resolves CASCADE order for us and
    // RESTART IDENTITY gives every demo run the same low-numbered IDs.
    await sql.unsafe(
      `TRUNCATE TABLE ${TABLES_IN_TRUNCATE_ORDER.join(', ')} RESTART IDENTITY CASCADE`
    );

    // -----------------------------------------------------------------
    // 1. TASK TEMPLATES (reuse production seed catalog)
    // -----------------------------------------------------------------
    for (const templateData of allTemplates) {
      const [insertedTemplate] = await db
        .insert(taskTemplates)
        .values(templateData.template)
        .returning();
      const itemsWithTemplateId = templateData.items.map((item) => ({
        ...item,
        templateId: insertedTemplate.id,
      }));
      await db.insert(taskTemplateItems).values(itemsWithTemplateId);
    }

    // -----------------------------------------------------------------
    // 2. CLIENTS
    // -----------------------------------------------------------------
    const insertedClients = await db
      .insert(clients)
      .values([
        {
          companyName: 'Lumen Robotics',
          contactName: 'Priya Shah',
          email: 'priya@lumen-robotics.demo',
          phone: '415-555-0142',
          address: '500 Mission St, San Francisco, CA 94105',
          notes: 'Quarterly all-hands and investor dinners. Prefers seasonal tasting menus.',
          portalEnabled: true,
          portalEnabledAt: new Date(),
        },
        {
          companyName: 'Northwind Capital',
          contactName: 'Daniel Reyes',
          email: 'daniel.reyes@northwindcap.demo',
          phone: '212-555-0177',
          address: '40 Wall Street, New York, NY 10005',
          notes: 'White-glove client. Wine pairings expected on every dinner.',
          portalEnabled: true,
          portalEnabledAt: new Date(),
        },
        {
          companyName: 'Cedar & Vine Weddings',
          contactName: 'Maya Okonkwo',
          email: 'maya@cedarandvine.demo',
          phone: '512-555-0188',
          address: '901 South Lamar Blvd, Austin, TX 78704',
          notes: 'Wedding planner — refers 6-10 events/year. Farm-to-table preferred.',
          portalEnabled: true,
          portalEnabledAt: new Date(),
        },
        {
          companyName: 'Harborline Architects',
          contactName: 'Theo Matsumoto',
          email: 'theo@harborline.demo',
          phone: '206-555-0119',
          address: '1100 Pike Place, Seattle, WA 98101',
          notes: 'Design-forward client. Plating matters as much as the food.',
          portalEnabled: false,
        },
        {
          companyName: 'Brightline Schools Foundation',
          contactName: 'Renee Caldwell',
          email: 'renee@brightlineschools.demo',
          phone: '617-555-0166',
          address: '210 Boylston St, Boston, MA 02116',
          notes: 'Annual gala plus three smaller donor dinners. Budget-sensitive but gracious.',
          portalEnabled: true,
          portalEnabledAt: new Date(),
        },
      ])
      .returning();

    // -----------------------------------------------------------------
    // 3. USERS (admin + manager + staff + portal)
    // -----------------------------------------------------------------
    const passwordHash = await bcrypt.hash('demo123!', 10);

    const insertedUsers = await db
      .insert(users)
      .values([
        // Internal staff
        {
          email: 'admin@demo.catering',
          passwordHash,
          name: 'Avery Park (Owner)',
          role: 'administrator',
          isActive: true,
        },
        {
          email: 'manager@demo.catering',
          passwordHash,
          name: 'Jordan Vasquez (Ops Manager)',
          role: 'manager',
          isActive: true,
        },
        {
          email: 'chef.marin@demo.catering',
          passwordHash,
          name: 'Marin Okafor',
          role: 'manager',
          isActive: true,
        },
        {
          email: 'sous.harlow@demo.catering',
          passwordHash,
          name: 'Harlow Bennett',
          role: 'manager',
          isActive: true,
        },
        {
          email: 'lead.sage@demo.catering',
          passwordHash,
          name: 'Sage Whitfield',
          role: 'manager',
          isActive: true,
        },
        {
          email: 'server.kai@demo.catering',
          passwordHash,
          name: 'Kai Nakamura',
          role: 'manager',
          isActive: true,
        },
        // Portal users (one per portal-enabled client)
        {
          email: 'priya@lumen-robotics.demo',
          passwordHash: null,
          name: 'Priya Shah',
          role: 'client',
          clientId: insertedClients[0].id,
          isActive: true,
        },
        {
          email: 'daniel.reyes@northwindcap.demo',
          passwordHash: null,
          name: 'Daniel Reyes',
          role: 'client',
          clientId: insertedClients[1].id,
          isActive: true,
        },
        {
          email: 'maya@cedarandvine.demo',
          passwordHash: null,
          name: 'Maya Okonkwo',
          role: 'client',
          clientId: insertedClients[2].id,
          isActive: true,
        },
        {
          email: 'renee@brightlineschools.demo',
          passwordHash: null,
          name: 'Renee Caldwell',
          role: 'client',
          clientId: insertedClients[4].id,
          isActive: true,
        },
      ])
      .returning();

    const adminUser = insertedUsers[0];
    const managerUser = insertedUsers[1];
    const chefMarin = insertedUsers[2];
    const sousHarlow = insertedUsers[3];
    const leadSage = insertedUsers[4];
    const serverKai = insertedUsers[5];
    const staffUsers = [chefMarin, sousHarlow, leadSage, serverKai];

    // -----------------------------------------------------------------
    // 4. STAFF SKILLS + AVAILABILITY (showcases staff-skills feature)
    // -----------------------------------------------------------------
    await db.insert(staffSkills).values([
      // Chef Marin — full chef stack
      { userId: chefMarin.id, skill: 'lead_chef', certifiedAt: new Date('2022-04-01') },
      {
        userId: chefMarin.id,
        skill: 'food_safety_cert',
        certifiedAt: new Date('2024-01-15'),
        expiresAt: new Date('2027-01-15'),
      },
      { userId: chefMarin.id, skill: 'pastry_chef', certifiedAt: new Date('2021-09-01') },
      // Sous Harlow
      { userId: sousHarlow.id, skill: 'sous_chef', certifiedAt: new Date('2023-06-01') },
      {
        userId: sousHarlow.id,
        skill: 'food_safety_cert',
        certifiedAt: new Date('2024-08-01'),
        expiresAt: new Date('2027-08-01'),
      },
      { userId: sousHarlow.id, skill: 'prep_cook', certifiedAt: new Date('2022-03-01') },
      // Lead Sage — front of house lead
      { userId: leadSage.id, skill: 'event_coordinator', certifiedAt: new Date('2023-02-01') },
      { userId: leadSage.id, skill: 'sommelier', certifiedAt: new Date('2024-05-01') },
      { userId: leadSage.id, skill: 'bartender' },
      // Server Kai
      { userId: serverKai.id, skill: 'server' },
      { userId: serverKai.id, skill: 'barista', certifiedAt: new Date('2025-03-01') },
    ]);

    // Weekly availability — Tue–Sat for kitchen, Wed–Sun for FOH lead
    const availabilityRows = staffUsers.flatMap((u) => {
      const isFoh = u.id === leadSage.id;
      const days = isFoh ? [3, 4, 5, 6, 0] : [2, 3, 4, 5, 6]; // Sun=0..Sat=6
      return days.map((dayOfWeek) => ({
        userId: u.id,
        dayOfWeek,
        startTime: isFoh ? '14:00' : '08:00',
        endTime: isFoh ? '23:00' : '18:00',
        isRecurring: true,
      }));
    });
    await db.insert(staffAvailability).values(availabilityRows);

    // -----------------------------------------------------------------
    // 5. RESOURCES (staff bridged to users + equipment + materials)
    // -----------------------------------------------------------------
    const insertedResources = await db
      .insert(resources)
      .values([
        {
          name: 'Marin Okafor (Lead Chef)',
          type: 'staff',
          hourlyRate: '85.00',
          userId: chefMarin.id,
          notes: 'Lead chef, plated dinners specialty',
        },
        {
          name: 'Harlow Bennett (Sous Chef)',
          type: 'staff',
          hourlyRate: '55.00',
          userId: sousHarlow.id,
        },
        {
          name: 'Sage Whitfield (FOH Lead)',
          type: 'staff',
          hourlyRate: '45.00',
          userId: leadSage.id,
          notes: 'Sommelier, runs front-of-house',
        },
        { name: 'Kai Nakamura (Server)', type: 'staff', hourlyRate: '28.00', userId: serverKai.id },
        {
          name: 'Server Pool (×4)',
          type: 'staff',
          hourlyRate: '26.00',
          notes: '4-person server pool for medium events',
        },
        {
          name: 'Mobile Convection Oven',
          type: 'equipment',
          hourlyRate: '35.00',
          notes: '6-rack mobile convection, 240V required',
        },
        {
          name: 'Induction Burner Cart',
          type: 'equipment',
          hourlyRate: '20.00',
          notes: '4-burner cart, plate-and-serve setups',
        },
        {
          name: 'Bar & Beverage Kit',
          type: 'equipment',
          hourlyRate: '40.00',
          notes: 'Speed rail, glassware, ice wells',
        },
        {
          name: 'Premium China Service (200)',
          type: 'materials',
          notes: 'Plates, flatware, linens — 200-cover set',
        },
        {
          name: 'Casual China Service (100)',
          type: 'materials',
          notes: '100-cover set for cocktail receptions',
        },
      ])
      .returning();

    // -----------------------------------------------------------------
    // 6. VENUES (showcases venue database — varied kitchen types)
    // -----------------------------------------------------------------
    const insertedVenues = await db
      .insert(venues)
      .values([
        {
          name: 'The Glasshouse Loft',
          address: '210 Brannan St, San Francisco, CA 94107',
          capacity: 220,
          hasKitchen: true,
          kitchenType: 'full',
          equipmentAvailable: [
            '6-burner range',
            'convection oven',
            'walk-in cooler',
            'commercial dishwasher',
          ],
          parkingNotes: 'Loading zone on Brannan, 30-minute limit. Garage at 200 Brannan.',
          loadInNotes: 'Service elevator on east side. Notify building 48hr ahead.',
          contactName: 'Maya Lin',
          contactPhone: '415-555-0210',
          contactEmail: 'events@glasshouse.demo',
        },
        {
          name: 'Cedar Hill Estate',
          address: '4400 Vineyard Rd, Sonoma, CA 95476',
          capacity: 180,
          hasKitchen: true,
          kitchenType: 'prep_only',
          equipmentAvailable: ['prep counters', 'two reach-in coolers', 'three-bay sink'],
          parkingNotes: 'On-site lot for 60 cars. Valet recommended for over 100 guests.',
          loadInNotes: 'Gravel road — reinforce wheels on rolling carts.',
          contactName: 'Jules Castellano',
          contactPhone: '707-555-0150',
        },
        {
          name: 'Harborline Studio',
          address: '1100 Pike Place, Seattle, WA 98101',
          capacity: 90,
          hasKitchen: true,
          kitchenType: 'warming_only',
          equipmentAvailable: ['warming cabinet', 'small prep counter'],
          parkingNotes: 'No on-site parking. Loading dock on Stewart St.',
          loadInNotes: 'Freight elevator only. Max cart size 36"×60".',
          contactName: 'Theo Matsumoto',
          contactPhone: '206-555-0119',
        },
        {
          name: 'Brightline Garden Tent',
          address: '210 Boylston St, Boston, MA 02116',
          capacity: 300,
          hasKitchen: false,
          kitchenType: 'none',
          equipmentAvailable: [],
          parkingNotes: 'Tent footprint blocks east lot. Use west lot for catering vehicles.',
          loadInNotes: 'Bring full mobile kitchen. Power available via tent generator.',
        },
      ])
      .returning();

    // -----------------------------------------------------------------
    // 7. VENDORS (showcases vendor management — covers all 8 service types)
    // -----------------------------------------------------------------
    const insertedVendors = await db
      .insert(vendors)
      .values([
        {
          companyName: 'Lakeshore Linens & Rentals',
          contactName: 'Iris Chen',
          email: 'orders@lakeshore-rentals.demo',
          phone: '415-555-0301',
          serviceType: 'rentals',
          notes: 'Tables, linens, china, glassware. Net-30 billing.',
        },
        {
          companyName: 'Cobalt & Sage Florals',
          contactName: 'Beatrix Holm',
          email: 'beatrix@cobaltsage.demo',
          phone: '415-555-0312',
          serviceType: 'florals',
          notes: 'Seasonal arrangements, sustainable sourcing.',
        },
        {
          companyName: 'Resound AV',
          contactName: 'Marcus Diallo',
          email: 'bookings@resoundav.demo',
          phone: '415-555-0344',
          serviceType: 'av',
          notes: 'Microphones, mixing, projection. Same-day setup OK with 7-day notice.',
        },
        {
          companyName: 'Aperture Lensworks',
          contactName: 'Nuri Park',
          email: 'nuri@aperturelens.demo',
          phone: '415-555-0388',
          serviceType: 'photography',
          notes: 'Editorial event photographer. 48hr turnaround on previews.',
        },
        {
          companyName: 'Pacific Coach Lines',
          contactName: 'Diego Romero',
          email: 'dispatch@pacificcoach.demo',
          phone: '415-555-0411',
          serviceType: 'transportation',
          notes: '20- and 40-passenger shuttles. Hourly minimums apply.',
        },
        {
          companyName: 'Lantern & Loft Decor',
          contactName: 'Sienna Whitlock',
          email: 'orders@lanternloft.demo',
          phone: '415-555-0429',
          serviceType: 'decor',
          notes: 'String lights, candles, custom signage.',
        },
        {
          companyName: 'Quintet Live',
          contactName: 'Rohan Mehta',
          email: 'rohan@quintetlive.demo',
          phone: '415-555-0466',
          serviceType: 'entertainment',
          notes: 'String quartet for ceremonies, jazz trio for cocktails.',
        },
        {
          companyName: 'Drift DJ Collective',
          contactName: 'Echo Ramirez',
          email: 'bookings@driftdj.demo',
          phone: '415-555-0473',
          serviceType: 'entertainment',
          notes: 'House and disco focus. Brings own PA.',
        },
        {
          companyName: 'Vellum Stationery',
          contactName: 'Wren Achebe',
          email: 'hello@vellum-paper.demo',
          phone: '415-555-0488',
          serviceType: 'other',
          notes: 'Menu cards, place settings, programs.',
        },
        {
          companyName: 'Tideline Ice Co.',
          contactName: 'Bo Petrov',
          email: 'orders@tidelineice.demo',
          phone: '415-555-0491',
          serviceType: 'other',
          notes: 'Block ice, sculpted centerpieces.',
        },
      ])
      .returning();

    // -----------------------------------------------------------------
    // 8. KITCHEN STATIONS (showcases kitchen production)
    // -----------------------------------------------------------------
    const insertedStations = await db
      .insert(kitchenStations)
      .values([
        {
          name: 'Prep Counter A',
          type: 'prep_counter',
          capacity: 2,
          venueId: insertedVenues[0].id,
          notes: 'Primary cold prep station',
        },
        {
          name: 'Hot Line — Stovetop',
          type: 'stovetop',
          capacity: 2,
          venueId: insertedVenues[0].id,
          notes: '6-burner gas range',
        },
        {
          name: 'Hot Line — Oven',
          type: 'oven',
          capacity: 4,
          venueId: insertedVenues[0].id,
          notes: 'Convection, 4 racks active',
        },
        {
          name: 'Cold Storage Walk-in',
          type: 'cold_storage',
          capacity: 1,
          venueId: insertedVenues[0].id,
          notes: 'Plated dessert holding',
        },
        {
          name: 'Mobile Grill (Off-site)',
          type: 'grill',
          capacity: 1,
          notes: 'For tent and outdoor events',
        },
      ])
      .returning();

    // -----------------------------------------------------------------
    // 9. MENU ITEMS (with production_steps so kitchen-production can auto-generate)
    // -----------------------------------------------------------------
    const insertedMenuItems = await db
      .insert(menuItems)
      .values([
        {
          name: 'Heirloom Tomato Bruschetta',
          description: 'Toasted sourdough, basil oil, aged balsamic',
          costPerPerson: '4.50',
          category: 'appetizer',
          allergens: ['gluten'],
          dietaryTags: ['vegetarian'],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Dice tomatoes & marinate',
              prepType: 'chop',
              stationType: 'prep_counter',
              durationMinutes: 30,
              offsetMinutes: -180,
            },
            {
              name: 'Toast sourdough',
              prepType: 'bake',
              stationType: 'oven',
              durationMinutes: 15,
              offsetMinutes: -45,
            },
            {
              name: 'Plate & garnish',
              prepType: 'plate',
              stationType: 'prep_counter',
              durationMinutes: 20,
              offsetMinutes: -30,
            },
          ],
        },
        {
          name: 'Seared Scallops, Cauliflower Purée',
          description: 'Diver scallops, brown butter, crispy capers',
          costPerPerson: '14.00',
          category: 'main',
          allergens: ['shellfish', 'dairy'],
          dietaryTags: ['gluten_free'],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Pat scallops dry, season',
              prepType: 'chop',
              stationType: 'prep_counter',
              durationMinutes: 15,
              offsetMinutes: -90,
            },
            {
              name: 'Sear scallops in batches',
              prepType: 'fry',
              stationType: 'stovetop',
              durationMinutes: 25,
              offsetMinutes: -25,
            },
            {
              name: 'Plate with purée',
              prepType: 'plate',
              stationType: 'prep_counter',
              durationMinutes: 20,
              offsetMinutes: -10,
            },
          ],
        },
        {
          name: 'Wild Mushroom Risotto',
          description: 'Carnaroli rice, porcini, parmesan, truffle oil',
          costPerPerson: '11.50',
          category: 'main',
          allergens: ['dairy'],
          dietaryTags: ['vegetarian', 'gluten_free'],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Mise en place — chop, measure',
              prepType: 'chop',
              stationType: 'prep_counter',
              durationMinutes: 25,
              offsetMinutes: -120,
            },
            {
              name: 'Cook risotto base',
              prepType: 'mix',
              stationType: 'stovetop',
              durationMinutes: 30,
              offsetMinutes: -45,
            },
            {
              name: 'Finish & plate',
              prepType: 'plate',
              stationType: 'prep_counter',
              durationMinutes: 15,
              offsetMinutes: -10,
            },
          ],
        },
        {
          name: 'Roasted Beet & Citrus Salad',
          description: 'Cara cara orange, pistachios, goat cheese',
          costPerPerson: '6.50',
          category: 'side',
          allergens: ['nuts', 'dairy'],
          dietaryTags: ['vegetarian', 'gluten_free'],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Roast beets',
              prepType: 'bake',
              stationType: 'oven',
              durationMinutes: 60,
              offsetMinutes: -240,
            },
            {
              name: 'Segment citrus, assemble',
              prepType: 'assemble',
              stationType: 'prep_counter',
              durationMinutes: 25,
              offsetMinutes: -45,
            },
          ],
        },
        {
          name: 'Charred Broccolini',
          description: 'Lemon, chili flake, sea salt',
          costPerPerson: '4.00',
          category: 'side',
          allergens: [],
          dietaryTags: ['vegan', 'gluten_free', 'dairy_free', 'nut_free'],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Trim & blanch',
              prepType: 'chop',
              stationType: 'prep_counter',
              durationMinutes: 15,
              offsetMinutes: -90,
            },
            {
              name: 'Char on grill',
              prepType: 'grill',
              stationType: 'grill',
              durationMinutes: 12,
              offsetMinutes: -20,
            },
          ],
        },
        {
          name: 'Olive Oil Cake, Whipped Crème Fraîche',
          description: 'Lemon zest, candied orange peel',
          costPerPerson: '7.00',
          category: 'dessert',
          allergens: ['gluten', 'dairy', 'eggs'],
          dietaryTags: ['vegetarian'],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Bake cakes',
              prepType: 'bake',
              stationType: 'oven',
              durationMinutes: 45,
              offsetMinutes: -300,
            },
            {
              name: 'Whip crème fraîche',
              prepType: 'mix',
              stationType: 'prep_counter',
              durationMinutes: 10,
              offsetMinutes: -60,
            },
            {
              name: 'Plate & garnish',
              prepType: 'garnish',
              stationType: 'cold_storage',
              durationMinutes: 15,
              offsetMinutes: -15,
            },
          ],
        },
        {
          name: 'Pavlova with Berry Compote',
          description: 'Crisp meringue, vanilla cream, summer berries',
          costPerPerson: '6.50',
          category: 'dessert',
          allergens: ['eggs', 'dairy'],
          dietaryTags: ['vegetarian', 'gluten_free', 'nut_free'],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Bake meringue shells',
              prepType: 'bake',
              stationType: 'oven',
              durationMinutes: 90,
              offsetMinutes: -360,
            },
            {
              name: 'Cook berry compote',
              prepType: 'mix',
              stationType: 'stovetop',
              durationMinutes: 20,
              offsetMinutes: -120,
            },
            {
              name: 'Assemble & plate',
              prepType: 'assemble',
              stationType: 'cold_storage',
              durationMinutes: 20,
              offsetMinutes: -15,
            },
          ],
        },
        {
          name: 'Sparkling Hibiscus Spritz',
          description: 'Hibiscus syrup, prosecco, lime',
          costPerPerson: '5.50',
          category: 'beverage',
          allergens: [],
          dietaryTags: ['vegan', 'gluten_free', 'dairy_free', 'nut_free'],
          createdBy: chefMarin.id,
        },
        {
          name: 'Cold-Brew Coffee Service',
          description: 'House cold brew, oat & whole milk, simple syrup',
          costPerPerson: '3.50',
          category: 'beverage',
          allergens: ['dairy'],
          dietaryTags: ['vegetarian', 'gluten_free'],
          createdBy: chefMarin.id,
        },
        {
          name: 'Whipped Ricotta Crostini',
          description: 'Honeycomb, lemon zest, cracked pepper',
          costPerPerson: '5.25',
          category: 'appetizer',
          allergens: ['gluten', 'dairy'],
          dietaryTags: ['vegetarian'],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Whip ricotta with herbs',
              prepType: 'mix',
              stationType: 'prep_counter',
              durationMinutes: 15,
              offsetMinutes: -90,
            },
            {
              name: 'Toast crostini',
              prepType: 'bake',
              stationType: 'oven',
              durationMinutes: 12,
              offsetMinutes: -30,
            },
            {
              name: 'Top & garnish',
              prepType: 'garnish',
              stationType: 'prep_counter',
              durationMinutes: 20,
              offsetMinutes: -15,
            },
          ],
        },
        {
          name: 'Braised Short Rib',
          description: 'Red wine reduction, parsnip purée, crispy shallot',
          costPerPerson: '18.00',
          category: 'main',
          allergens: ['dairy'],
          dietaryTags: ['gluten_free'],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Sear & braise short ribs',
              prepType: 'bake',
              stationType: 'oven',
              durationMinutes: 240,
              offsetMinutes: -360,
            },
            {
              name: 'Reduce sauce',
              prepType: 'mix',
              stationType: 'stovetop',
              durationMinutes: 30,
              offsetMinutes: -45,
            },
            {
              name: 'Plate',
              prepType: 'plate',
              stationType: 'prep_counter',
              durationMinutes: 20,
              offsetMinutes: -10,
            },
          ],
        },
        {
          name: 'Herb-Crusted Lamb Loin',
          description: 'Mustard, panko, rosemary jus',
          costPerPerson: '22.00',
          category: 'main',
          allergens: ['gluten', 'mustard'],
          dietaryTags: [],
          createdBy: chefMarin.id,
          productionSteps: [
            {
              name: 'Trim & coat lamb',
              prepType: 'chop',
              stationType: 'prep_counter',
              durationMinutes: 25,
              offsetMinutes: -120,
            },
            {
              name: 'Roast lamb',
              prepType: 'bake',
              stationType: 'oven',
              durationMinutes: 35,
              offsetMinutes: -45,
            },
            {
              name: 'Rest & slice',
              prepType: 'plate',
              stationType: 'prep_counter',
              durationMinutes: 15,
              offsetMinutes: -15,
            },
          ],
        },
      ])
      .returning();

    // -----------------------------------------------------------------
    // 10. EVENTS — mix of past, near-term, far-future across statuses
    // -----------------------------------------------------------------
    const now = new Date();
    const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
    const at = (date: Date, hour: number) => {
      const d = new Date(date);
      d.setHours(hour, 0, 0, 0);
      return d;
    };

    const insertedEvents = await db
      .insert(events)
      .values([
        // 0: SHOWCASE — 5 days out, fully populated for demo flow
        {
          clientId: insertedClients[0].id,
          eventName: 'Lumen Robotics Investor Dinner',
          eventDate: at(days(5), 18),
          location: 'The Glasshouse Loft, San Francisco',
          status: 'preparation',
          estimatedAttendees: 60,
          notes: 'Plated 4-course dinner. Series C announcement — keep press-quality plating.',
          createdBy: adminUser.id,
          venueId: insertedVenues[0].id,
        },
        // 1: tomorrow, in_progress
        {
          clientId: insertedClients[1].id,
          eventName: 'Northwind Capital Partner Lunch',
          eventDate: at(days(1), 12),
          location: 'Northwind HQ, 40 Wall St',
          status: 'in_progress',
          estimatedAttendees: 24,
          notes: 'Drop-and-set. Vegetarian + GF mains required.',
          createdBy: managerUser.id,
        },
        // 2: 2 weeks out, planning, full wedding
        {
          clientId: insertedClients[2].id,
          eventName: 'Okonkwo–Patel Wedding Reception',
          eventDate: at(days(14), 17),
          location: 'Cedar Hill Estate, Sonoma',
          status: 'planning',
          estimatedAttendees: 160,
          notes: 'Farm-to-table tasting menu. Local Sonoma wines.',
          createdBy: adminUser.id,
          venueId: insertedVenues[1].id,
        },
        // 3: 3 weeks out, planning
        {
          clientId: insertedClients[4].id,
          eventName: 'Brightline Schools Annual Gala',
          eventDate: at(days(21), 18),
          location: 'Brightline Garden Tent, Boston',
          status: 'planning',
          estimatedAttendees: 280,
          notes: 'Outdoor tent. Bring full mobile kitchen + generator-friendly setup.',
          createdBy: adminUser.id,
          venueId: insertedVenues[3].id,
        },
        // 4: 6 weeks out, inquiry
        {
          clientId: insertedClients[3].id,
          eventName: 'Harborline Studio Reopening Reception',
          eventDate: at(days(42), 19),
          location: 'Harborline Studio, Seattle',
          status: 'inquiry',
          estimatedAttendees: 90,
          notes: 'Cocktail style. Studio kitchen is warming-only.',
          createdBy: managerUser.id,
          venueId: insertedVenues[2].id,
        },
        // 5: 8 weeks out, inquiry
        {
          clientId: insertedClients[0].id,
          eventName: 'Lumen Robotics Q4 All-Hands',
          eventDate: at(days(56), 12),
          location: 'TBD — likely Glasshouse',
          status: 'inquiry',
          estimatedAttendees: 110,
          notes: 'Buffet style. Dietary-friendly menu mix expected.',
          createdBy: managerUser.id,
        },
        // 6: 7 days ago, completed
        {
          clientId: insertedClients[1].id,
          eventName: 'Northwind Capital Year-End Dinner',
          eventDate: at(days(-7), 19),
          location: 'The Glasshouse Loft, San Francisco',
          status: 'completed',
          estimatedAttendees: 75,
          notes: 'Wrapped clean. Client requested same menu for spring follow-up.',
          createdBy: adminUser.id,
          venueId: insertedVenues[0].id,
        },
        // 7: 18 days ago, follow_up (invoicing not yet finalized)
        {
          clientId: insertedClients[2].id,
          eventName: 'Spring Florals Wedding Tasting',
          eventDate: at(days(-18), 13),
          location: 'Cedar Hill Estate, Sonoma',
          status: 'follow_up',
          estimatedAttendees: 14,
          notes: 'Tasting for late-summer wedding. Awaiting client decisions.',
          createdBy: adminUser.id,
          venueId: insertedVenues[1].id,
        },
        // 8: 35 days ago, completed
        {
          clientId: insertedClients[4].id,
          eventName: 'Brightline Donor Cocktail Reception',
          eventDate: at(days(-35), 18),
          location: 'Boston Public Library Atrium',
          status: 'completed',
          estimatedAttendees: 120,
          notes: 'Smooth event. Renee referred two new prospects.',
          createdBy: managerUser.id,
        },
        // 9: 60 days ago, completed (archived)
        {
          clientId: insertedClients[3].id,
          eventName: 'Harborline Architects Holiday Party',
          eventDate: at(days(-60), 18),
          location: 'Harborline Studio, Seattle',
          status: 'completed',
          estimatedAttendees: 65,
          notes: 'Closed out cleanly.',
          createdBy: managerUser.id,
          venueId: insertedVenues[2].id,
          isArchived: true,
          archivedAt: days(-30),
          archivedBy: adminUser.id,
        },
      ])
      .returning();

    const showcase = insertedEvents[0];
    const wedding = insertedEvents[2];
    const tomorrowLunch = insertedEvents[1];
    const completedDinner = insertedEvents[6];

    // -----------------------------------------------------------------
    // 11. EVENT MENUS + ITEMS (focus on showcase + wedding)
    // -----------------------------------------------------------------
    const showcaseMenu = (
      await db
        .insert(eventMenus)
        .values({ eventId: showcase.id, name: 'Investor Dinner — Plated 4-Course', sortOrder: 0 })
        .returning()
    )[0];
    await db.insert(eventMenuItems).values([
      { eventMenuId: showcaseMenu.id, menuItemId: insertedMenuItems[9].id, sortOrder: 1 }, // Whipped Ricotta Crostini
      { eventMenuId: showcaseMenu.id, menuItemId: insertedMenuItems[3].id, sortOrder: 2 }, // Roasted Beet Salad
      { eventMenuId: showcaseMenu.id, menuItemId: insertedMenuItems[10].id, sortOrder: 3 }, // Braised Short Rib
      { eventMenuId: showcaseMenu.id, menuItemId: insertedMenuItems[5].id, sortOrder: 4 }, // Olive Oil Cake
      { eventMenuId: showcaseMenu.id, menuItemId: insertedMenuItems[7].id, sortOrder: 5 }, // Hibiscus Spritz
    ]);

    const weddingMenu = (
      await db
        .insert(eventMenus)
        .values({ eventId: wedding.id, name: 'Reception Tasting Menu', sortOrder: 0 })
        .returning()
    )[0];
    await db.insert(eventMenuItems).values([
      { eventMenuId: weddingMenu.id, menuItemId: insertedMenuItems[0].id, sortOrder: 1 }, // Bruschetta
      { eventMenuId: weddingMenu.id, menuItemId: insertedMenuItems[1].id, sortOrder: 2 }, // Scallops
      { eventMenuId: weddingMenu.id, menuItemId: insertedMenuItems[11].id, sortOrder: 3 }, // Lamb Loin
      {
        eventMenuId: weddingMenu.id,
        menuItemId: insertedMenuItems[2].id,
        sortOrder: 4,
        notes: 'Vegetarian alt',
      }, // Risotto
      { eventMenuId: weddingMenu.id, menuItemId: insertedMenuItems[4].id, sortOrder: 5 }, // Broccolini
      { eventMenuId: weddingMenu.id, menuItemId: insertedMenuItems[6].id, sortOrder: 6 }, // Pavlova
    ]);

    // Lighter menu for tomorrow's lunch
    const lunchMenu = (
      await db
        .insert(eventMenus)
        .values({ eventId: tomorrowLunch.id, name: 'Partner Lunch', sortOrder: 0 })
        .returning()
    )[0];
    await db.insert(eventMenuItems).values([
      { eventMenuId: lunchMenu.id, menuItemId: insertedMenuItems[3].id, sortOrder: 1 },
      { eventMenuId: lunchMenu.id, menuItemId: insertedMenuItems[2].id, sortOrder: 2 }, // GF/V main
      { eventMenuId: lunchMenu.id, menuItemId: insertedMenuItems[8].id, sortOrder: 3 }, // Cold brew
    ]);

    // -----------------------------------------------------------------
    // 12. EVENT VENDORS (showcases vendor management)
    // -----------------------------------------------------------------
    const vendorAssignments = [
      // Showcase event — full vendor stack
      {
        eventId: showcase.id,
        vendorId: insertedVendors[0].id,
        role: 'Linens & china rental',
        cost: '1850.00',
      },
      {
        eventId: showcase.id,
        vendorId: insertedVendors[1].id,
        role: 'Centerpieces & buttonholes',
        cost: '2400.00',
      },
      {
        eventId: showcase.id,
        vendorId: insertedVendors[2].id,
        role: 'Microphones for toasts',
        cost: '650.00',
      },
      {
        eventId: showcase.id,
        vendorId: insertedVendors[3].id,
        role: 'Event photography',
        cost: '1800.00',
      },
      // Wedding — biggest vendor stack
      {
        eventId: wedding.id,
        vendorId: insertedVendors[0].id,
        role: 'Tents, linens, dance floor',
        cost: '8400.00',
      },
      {
        eventId: wedding.id,
        vendorId: insertedVendors[1].id,
        role: 'Ceremony & reception florals',
        cost: '6200.00',
      },
      {
        eventId: wedding.id,
        vendorId: insertedVendors[6].id,
        role: 'String quartet (ceremony)',
        cost: '1200.00',
      },
      {
        eventId: wedding.id,
        vendorId: insertedVendors[7].id,
        role: 'DJ (reception)',
        cost: '2400.00',
      },
      { eventId: wedding.id, vendorId: insertedVendors[3].id, role: 'Wedding photography' },
      {
        eventId: wedding.id,
        vendorId: insertedVendors[4].id,
        role: 'Guest shuttle (3 trips)',
        cost: '1500.00',
      },
      {
        eventId: wedding.id,
        vendorId: insertedVendors[8].id,
        role: 'Menu cards & place settings',
        cost: '480.00',
      },
      // Brightline gala — partial
      {
        eventId: insertedEvents[3].id,
        vendorId: insertedVendors[5].id,
        role: 'String lights, candles',
      },
      { eventId: insertedEvents[3].id, vendorId: insertedVendors[2].id, role: 'AV for keynote' },
      {
        eventId: insertedEvents[3].id,
        vendorId: insertedVendors[9].id,
        role: 'Ice sculpture centerpiece',
      },
      // Past completed dinner — historical
      {
        eventId: completedDinner.id,
        vendorId: insertedVendors[0].id,
        role: 'Linens',
        cost: '1100.00',
      },
      {
        eventId: completedDinner.id,
        vendorId: insertedVendors[1].id,
        role: 'Florals',
        cost: '1450.00',
      },
    ];
    const insertedEventVendors = await db
      .insert(eventVendors)
      .values(vendorAssignments)
      .returning();

    // -----------------------------------------------------------------
    // 13. PRODUCTION TASKS (showcases kitchen production timeline)
    // -----------------------------------------------------------------
    // Generate production tasks from showcase menu items' productionSteps
    const showcaseEventDate = showcase.eventDate;
    const stationByType: Record<string, number> = {
      prep_counter: insertedStations[0].id,
      stovetop: insertedStations[1].id,
      oven: insertedStations[2].id,
      cold_storage: insertedStations[3].id,
      grill: insertedStations[4].id,
    };

    const showcaseMenuItemIds = [9, 3, 10, 5]; // ricotta, beet, short rib, olive cake — items with steps
    const productionTaskRows = showcaseMenuItemIds.flatMap((idx) => {
      const item = insertedMenuItems[idx];
      const steps =
        (item.productionSteps as Array<{
          name: string;
          prepType: string;
          stationType: string;
          durationMinutes: number;
          offsetMinutes: number;
        }> | null) ?? [];
      return steps.map((step) => {
        const scheduledStart = new Date(
          showcaseEventDate.getTime() + step.offsetMinutes * 60 * 1000
        );
        const scheduledEnd = new Date(scheduledStart.getTime() + step.durationMinutes * 60 * 1000);
        return {
          eventId: showcase.id,
          menuItemId: item.id,
          stationId: stationByType[step.stationType] ?? insertedStations[0].id,
          name: `${item.name}: ${step.name}`,
          prepType: step.prepType as
            | 'marinate'
            | 'bake'
            | 'grill'
            | 'plate'
            | 'chop'
            | 'mix'
            | 'chill'
            | 'fry'
            | 'assemble'
            | 'garnish',
          durationMinutes: step.durationMinutes,
          offsetMinutes: step.offsetMinutes,
          scheduledStart,
          scheduledEnd,
          servings: 60,
          assignedTo: chefMarin.id,
          isAutoGenerated: true,
        };
      });
    });
    const insertedProductionTasks = await db
      .insert(productionTasks)
      .values(productionTaskRows)
      .returning();

    // -----------------------------------------------------------------
    // 14. EVENT TASKS (lifecycle tasks for several events)
    // -----------------------------------------------------------------
    const insertedTasks = await db
      .insert(tasks)
      .values([
        // Showcase — preparation phase, mixed states
        {
          eventId: showcase.id,
          title: 'Confirm final headcount with client',
          category: 'pre_event',
          status: 'completed',
          assignedTo: managerUser.id,
          dueDate: days(-2),
          completedAt: days(-1),
        },
        {
          eventId: showcase.id,
          title: 'Lock plating walkthrough with chef',
          category: 'pre_event',
          status: 'in_progress',
          assignedTo: chefMarin.id,
          dueDate: days(2),
        },
        {
          eventId: showcase.id,
          title: 'Finalize wine pairing list',
          category: 'pre_event',
          status: 'in_progress',
          assignedTo: leadSage.id,
          dueDate: days(2),
        },
        {
          eventId: showcase.id,
          title: 'Order specialty short rib + lamb',
          category: 'pre_event',
          status: 'pending',
          assignedTo: chefMarin.id,
          dueDate: days(3),
        },
        {
          eventId: showcase.id,
          title: 'Vendor load-in coordination',
          category: 'pre_event',
          status: 'pending',
          assignedTo: managerUser.id,
          dueDate: days(4),
        },
        {
          eventId: showcase.id,
          title: 'On-site setup',
          category: 'during_event',
          status: 'pending',
          assignedTo: managerUser.id,
          dueDate: at(showcase.eventDate, 14),
        },
        {
          eventId: showcase.id,
          title: 'Service execution',
          category: 'during_event',
          status: 'pending',
          assignedTo: chefMarin.id,
          dueDate: at(showcase.eventDate, 18),
        },
        {
          eventId: showcase.id,
          title: 'Send thank-you + photo selects',
          category: 'post_event',
          status: 'pending',
          assignedTo: adminUser.id,
          dueDate: days(7),
        },

        // Tomorrow's lunch — in_progress
        {
          eventId: tomorrowLunch.id,
          title: 'Pack and load delivery vehicle',
          category: 'pre_event',
          status: 'completed',
          assignedTo: sousHarlow.id,
          dueDate: days(0),
          completedAt: new Date(),
        },
        {
          eventId: tomorrowLunch.id,
          title: 'Drop-off + setup',
          category: 'during_event',
          status: 'in_progress',
          assignedTo: serverKai.id,
          dueDate: at(days(1), 11),
        },

        // Wedding — planning
        {
          eventId: wedding.id,
          title: 'Finalize tasting menu selections',
          category: 'pre_event',
          status: 'in_progress',
          assignedTo: chefMarin.id,
          dueDate: days(7),
        },
        {
          eventId: wedding.id,
          title: 'Confirm vendor contracts (florals, AV)',
          category: 'pre_event',
          status: 'pending',
          assignedTo: managerUser.id,
          dueDate: days(9),
        },
        {
          eventId: wedding.id,
          title: 'Source seasonal Sonoma wines',
          category: 'pre_event',
          status: 'pending',
          assignedTo: leadSage.id,
          dueDate: days(10),
        },

        // Brightline gala — planning
        {
          eventId: insertedEvents[3].id,
          title: 'Site walk + power survey',
          category: 'pre_event',
          status: 'pending',
          assignedTo: managerUser.id,
          dueDate: days(7),
        },
        {
          eventId: insertedEvents[3].id,
          title: 'Generator + mobile kitchen rental',
          category: 'pre_event',
          status: 'pending',
          assignedTo: managerUser.id,
          dueDate: days(10),
        },

        // Past completed — closed out
        {
          eventId: completedDinner.id,
          title: 'Send invoice and thank-you',
          category: 'post_event',
          status: 'completed',
          assignedTo: adminUser.id,
          dueDate: days(-5),
          completedAt: days(-5),
        },

        // Follow-up tasting
        {
          eventId: insertedEvents[7].id,
          title: 'Wait for client menu decision',
          category: 'post_event',
          status: 'in_progress',
          assignedTo: adminUser.id,
          dueDate: days(2),
        },
      ])
      .returning();

    // -----------------------------------------------------------------
    // 15. RESOURCE SCHEDULE (showcases drag-drop calendar)
    // -----------------------------------------------------------------
    const scheduleRows = [
      // Showcase event day — kitchen team + FOH
      {
        resourceId: insertedResources[0].id,
        eventId: showcase.id,
        startTime: at(showcase.eventDate, 10),
        endTime: at(showcase.eventDate, 23),
        notes: 'Lead chef, full service',
      },
      {
        resourceId: insertedResources[1].id,
        eventId: showcase.id,
        startTime: at(showcase.eventDate, 11),
        endTime: at(showcase.eventDate, 22),
      },
      {
        resourceId: insertedResources[2].id,
        eventId: showcase.id,
        startTime: at(showcase.eventDate, 14),
        endTime: at(showcase.eventDate, 23),
        notes: 'FOH lead + sommelier',
      },
      {
        resourceId: insertedResources[3].id,
        eventId: showcase.id,
        startTime: at(showcase.eventDate, 16),
        endTime: at(showcase.eventDate, 23),
      },
      {
        resourceId: insertedResources[4].id,
        eventId: showcase.id,
        startTime: at(showcase.eventDate, 16),
        endTime: at(showcase.eventDate, 23),
      },
      {
        resourceId: insertedResources[5].id,
        eventId: showcase.id,
        startTime: at(showcase.eventDate, 8),
        endTime: at(showcase.eventDate, 23),
      },
      {
        resourceId: insertedResources[8].id,
        eventId: showcase.id,
        startTime: at(showcase.eventDate, 14),
        endTime: at(showcase.eventDate, 23),
      },
      // Wedding — pre-event setup day before
      {
        resourceId: insertedResources[0].id,
        eventId: wedding.id,
        startTime: at(wedding.eventDate, 9),
        endTime: at(wedding.eventDate, 23),
      },
      {
        resourceId: insertedResources[1].id,
        eventId: wedding.id,
        startTime: at(wedding.eventDate, 10),
        endTime: at(wedding.eventDate, 22),
      },
      {
        resourceId: insertedResources[2].id,
        eventId: wedding.id,
        startTime: at(wedding.eventDate, 13),
        endTime: at(wedding.eventDate, 23),
      },
      {
        resourceId: insertedResources[4].id,
        eventId: wedding.id,
        startTime: at(wedding.eventDate, 14),
        endTime: at(wedding.eventDate, 23),
      },
      {
        resourceId: insertedResources[5].id,
        eventId: wedding.id,
        startTime: at(wedding.eventDate, 8),
        endTime: at(wedding.eventDate, 23),
      },
      {
        resourceId: insertedResources[8].id,
        eventId: wedding.id,
        startTime: at(wedding.eventDate, 13),
        endTime: at(wedding.eventDate, 23),
      },
      // Tomorrow's lunch — light staffing
      {
        resourceId: insertedResources[1].id,
        eventId: tomorrowLunch.id,
        startTime: at(tomorrowLunch.eventDate, 9),
        endTime: at(tomorrowLunch.eventDate, 14),
      },
      {
        resourceId: insertedResources[3].id,
        eventId: tomorrowLunch.id,
        startTime: at(tomorrowLunch.eventDate, 11),
        endTime: at(tomorrowLunch.eventDate, 14),
      },
      // Brightline gala
      {
        resourceId: insertedResources[0].id,
        eventId: insertedEvents[3].id,
        startTime: at(insertedEvents[3].eventDate, 9),
        endTime: at(insertedEvents[3].eventDate, 23),
      },
      {
        resourceId: insertedResources[1].id,
        eventId: insertedEvents[3].id,
        startTime: at(insertedEvents[3].eventDate, 10),
        endTime: at(insertedEvents[3].eventDate, 23),
      },
      {
        resourceId: insertedResources[4].id,
        eventId: insertedEvents[3].id,
        startTime: at(insertedEvents[3].eventDate, 14),
        endTime: at(insertedEvents[3].eventDate, 23),
      },
    ];
    const insertedSchedule = await db.insert(resourceSchedule).values(scheduleRows).returning();

    // -----------------------------------------------------------------
    // 16. EXPENSES (showcases vendor_id linkage)
    // -----------------------------------------------------------------
    const expenseRows = [
      {
        eventId: showcase.id,
        category: 'food_supplies' as const,
        description: 'Specialty proteins (short rib, lamb)',
        amount: '1240.00',
        expenseDate: days(-1),
        createdBy: chefMarin.id,
      },
      {
        eventId: showcase.id,
        category: 'food_supplies' as const,
        description: 'Produce + dairy delivery',
        amount: '680.00',
        expenseDate: days(-1),
        createdBy: sousHarlow.id,
      },
      {
        eventId: showcase.id,
        category: 'equipment_rental' as const,
        description: 'Linens & china',
        amount: '1850.00',
        vendor: 'Lakeshore Linens & Rentals',
        vendorId: insertedVendors[0].id,
        expenseDate: days(-3),
        createdBy: managerUser.id,
      },
      {
        eventId: showcase.id,
        category: 'decor' as const,
        description: 'Centerpieces',
        amount: '2400.00',
        vendor: 'Cobalt & Sage Florals',
        vendorId: insertedVendors[1].id,
        expenseDate: days(-3),
        createdBy: managerUser.id,
      },
      {
        eventId: completedDinner.id,
        category: 'food_supplies' as const,
        description: 'Year-end menu ingredients',
        amount: '1480.00',
        expenseDate: days(-9),
        createdBy: chefMarin.id,
      },
      {
        eventId: completedDinner.id,
        category: 'labor' as const,
        description: 'Server pool 5hr shift',
        amount: '650.00',
        expenseDate: days(-7),
        createdBy: managerUser.id,
      },
      {
        eventId: completedDinner.id,
        category: 'equipment_rental' as const,
        description: 'Linens',
        amount: '1100.00',
        vendor: 'Lakeshore Linens & Rentals',
        vendorId: insertedVendors[0].id,
        expenseDate: days(-9),
        createdBy: managerUser.id,
      },
      {
        eventId: completedDinner.id,
        category: 'decor' as const,
        description: 'Florals',
        amount: '1450.00',
        vendor: 'Cobalt & Sage Florals',
        vendorId: insertedVendors[1].id,
        expenseDate: days(-9),
        createdBy: managerUser.id,
      },
      {
        eventId: insertedEvents[8].id,
        category: 'food_supplies' as const,
        description: 'Cocktail reception passed apps',
        amount: '2100.00',
        expenseDate: days(-37),
        createdBy: chefMarin.id,
      },
      {
        eventId: insertedEvents[8].id,
        category: 'beverages' as const,
        description: 'Wine + spirits',
        amount: '1850.00',
        expenseDate: days(-37),
        createdBy: leadSage.id,
      },
    ];
    const insertedExpenses = await db.insert(expenses).values(expenseRows).returning();

    // -----------------------------------------------------------------
    // 17. INVOICES (showcase + completed events)
    // -----------------------------------------------------------------
    const completedInvoice = (
      await db
        .insert(invoices)
        .values({
          eventId: completedDinner.id,
          invoiceNumber: `INV-${formatInvoiceDate(days(-7))}-001`,
          status: 'paid',
          subtotal: '12500.00',
          taxRate: '0.0875',
          taxAmount: '1093.75',
          total: '13593.75',
          dueDate: days(7),
          sentAt: days(-6),
          createdBy: adminUser.id,
        })
        .returning()
    )[0];
    await db.insert(invoiceLineItems).values([
      {
        invoiceId: completedInvoice.id,
        description: 'Catering service — 75 guests, 4-course plated',
        quantity: '75.00',
        unitPrice: '125.00',
        amount: '9375.00',
        sortOrder: 1,
      },
      {
        invoiceId: completedInvoice.id,
        description: 'Server pool (5 staff × 5 hr)',
        quantity: '25.00',
        unitPrice: '26.00',
        amount: '650.00',
        sortOrder: 2,
      },
      {
        invoiceId: completedInvoice.id,
        description: 'Bar service & beverages',
        quantity: '1.00',
        unitPrice: '1925.00',
        amount: '1925.00',
        sortOrder: 3,
      },
      {
        invoiceId: completedInvoice.id,
        description: 'Linens & florals (passthrough)',
        quantity: '1.00',
        unitPrice: '550.00',
        amount: '550.00',
        sortOrder: 4,
      },
    ]);

    const showcaseInvoice = (
      await db
        .insert(invoices)
        .values({
          eventId: showcase.id,
          invoiceNumber: `INV-${formatInvoiceDate(now)}-001`,
          status: 'sent',
          subtotal: '14400.00',
          taxRate: '0.0875',
          taxAmount: '1260.00',
          total: '15660.00',
          dueDate: days(30),
          sentAt: days(-1),
          createdBy: adminUser.id,
        })
        .returning()
    )[0];
    await db.insert(invoiceLineItems).values([
      {
        invoiceId: showcaseInvoice.id,
        description: 'Plated dinner — 60 guests, 4 courses',
        quantity: '60.00',
        unitPrice: '180.00',
        amount: '10800.00',
        sortOrder: 1,
      },
      {
        invoiceId: showcaseInvoice.id,
        description: 'Wine pairing supplement',
        quantity: '60.00',
        unitPrice: '32.00',
        amount: '1920.00',
        sortOrder: 2,
      },
      {
        invoiceId: showcaseInvoice.id,
        description: 'Vendor passthrough (florals + linens)',
        quantity: '1.00',
        unitPrice: '1680.00',
        amount: '1680.00',
        sortOrder: 3,
      },
    ]);

    // -----------------------------------------------------------------
    // 18. COMMUNICATIONS (a few entries to power follow-up cron + activity)
    // -----------------------------------------------------------------
    await db.insert(communications).values([
      {
        eventId: showcase.id,
        clientId: insertedClients[0].id,
        type: 'email',
        subject: 'Plating walkthrough confirmation',
        notes: 'Sent menu cards and seating chart for review',
        contactedAt: days(-2),
        contactedBy: managerUser.id,
        followUpDate: days(1),
        followUpCompleted: false,
      },
      {
        eventId: wedding.id,
        clientId: insertedClients[2].id,
        type: 'meeting',
        subject: 'Tasting recap',
        notes: 'Locked apps + main pairings, dessert TBD',
        contactedAt: days(-3),
        contactedBy: adminUser.id,
        followUpDate: days(4),
        followUpCompleted: false,
      },
      {
        eventId: insertedEvents[4].id,
        clientId: insertedClients[3].id,
        type: 'phone',
        subject: 'Initial scope call',
        notes: 'Studio reopening, cocktail style, 90 guests',
        contactedAt: days(-1),
        contactedBy: managerUser.id,
        followUpDate: days(2),
        followUpCompleted: false,
      },
      {
        eventId: completedDinner.id,
        clientId: insertedClients[1].id,
        type: 'email',
        subject: 'Thank you + spring rebook',
        notes: 'Daniel asked about spring follow-up dinner',
        contactedAt: days(-5),
        contactedBy: adminUser.id,
        followUpDate: null,
        followUpCompleted: true,
      },
    ]);

    return {
      clients: insertedClients.length,
      users: insertedUsers.length,
      venues: insertedVenues.length,
      vendors: insertedVendors.length,
      menuItems: insertedMenuItems.length,
      kitchenStations: insertedStations.length,
      events: insertedEvents.length,
      tasks: insertedTasks.length,
      productionTasks: insertedProductionTasks.length,
      resourceScheduleBlocks: insertedSchedule.length,
      expenses: insertedExpenses.length,
      invoices: 2,
      eventVendors: insertedEventVendors.length,
      taskTemplates: allTemplates.length,
    };
  } finally {
    await sql.end();
  }
}

function formatInvoiceDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// -----------------------------------------------------------------
// CLI entrypoint — `pnpm db:seed:demo`
// -----------------------------------------------------------------
async function main() {
  if (process.env.DEMO_RESET_ALLOWED !== 'true') {
    console.error(
      '❌ Refusing to run: DEMO_RESET_ALLOWED must be set to "true" to wipe and reseed the database.'
    );
    console.error('   Set DEMO_RESET_ALLOWED=true in the demo environment only.');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('🌱 Demo seed starting…');
  console.log(`   Target: ${redactConnectionString(connectionString)}`);

  try {
    const result = await seedDemo(connectionString);
    console.log('\n✨ Demo seed complete!');
    for (const [key, value] of Object.entries(result)) {
      console.log(`   - ${key}: ${value}`);
    }
    console.log('\n🔑 Demo logins (password: demo123!)');
    console.log('   Owner:        admin@demo.catering');
    console.log('   Ops Manager:  manager@demo.catering');
    console.log('   Lead Chef:    chef.marin@demo.catering');
  } catch (error) {
    console.error('❌ Demo seed failed:', error);
    process.exit(1);
  }
}

function redactConnectionString(url: string): string {
  return url.replace(/:[^:@]+@/, ':****@');
}

if (require.main === module) {
  main();
}
