/**
 * Task Template Seed Data
 *
 * Pre-defined templates for common catering event types.
 * Used by seed.ts to populate the task_templates and task_template_items tables.
 */

import type { InferInsertModel } from 'drizzle-orm';
import type { taskTemplateItems, taskTemplates } from './schema';

type TemplateInsert = InferInsertModel<typeof taskTemplates>;
type TemplateItemInsert = Omit<InferInsertModel<typeof taskTemplateItems>, 'templateId'>;

interface TemplateWithItems {
  template: Omit<TemplateInsert, 'id'>;
  items: TemplateItemInsert[];
}

/**
 * Standard Event Template (12 tasks)
 * Typical catered event with full service
 */
export const standardEventTemplate: TemplateWithItems = {
  template: {
    name: 'Standard Event',
    description:
      'Typical catered event with full service - includes prep, service, and follow-up tasks',
  },
  items: [
    // PRE-EVENT
    {
      title: 'Confirm guest count with client',
      description: 'Verify final headcount and any dietary restrictions or allergies',
      category: 'pre_event',
      daysOffset: -14,
      dependsOnIndex: null,
      sortOrder: 1,
    },
    {
      title: 'Finalize menu selections',
      description: 'Lock in appetizers, main courses, and desserts based on guest preferences',
      category: 'pre_event',
      daysOffset: -10,
      dependsOnIndex: 1,
      sortOrder: 2,
    },
    {
      title: 'Order supplies and ingredients',
      description: 'Place orders for all food items, beverages, and disposables',
      category: 'pre_event',
      daysOffset: -7,
      dependsOnIndex: 2,
      sortOrder: 3,
    },
    {
      title: 'Confirm staffing assignments',
      description: 'Verify all staff availability and assign roles for the event',
      category: 'pre_event',
      daysOffset: -5,
      dependsOnIndex: null,
      sortOrder: 4,
    },
    {
      title: 'Prep make-ahead items',
      description: 'Prepare sauces, marinades, and items that can be made in advance',
      category: 'pre_event',
      daysOffset: -2,
      dependsOnIndex: 3,
      sortOrder: 5,
    },
    {
      title: 'Final walkthrough with venue',
      description: 'Confirm setup location, power access, and timeline with venue contact',
      category: 'pre_event',
      daysOffset: -1,
      dependsOnIndex: null,
      sortOrder: 6,
    },
    // DURING-EVENT
    {
      title: 'Load and transport equipment',
      description: 'Pack all equipment, food, and supplies; transport to venue',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 5,
      sortOrder: 7,
    },
    {
      title: 'Set up serving stations',
      description: 'Arrange buffet tables, beverage stations, and dining areas',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 7,
      sortOrder: 8,
    },
    {
      title: 'Execute service',
      description: 'Serve food, manage buffet replenishment, handle guest requests',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 8,
      sortOrder: 9,
    },
    {
      title: 'Break down and pack equipment',
      description: 'Clean up, pack all equipment, and leave venue in original condition',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 9,
      sortOrder: 10,
    },
    // POST-EVENT
    {
      title: 'Return rented equipment',
      description: 'Return any rental items and verify condition',
      category: 'post_event',
      daysOffset: 1,
      dependsOnIndex: 10,
      sortOrder: 11,
    },
    {
      title: 'Send thank-you and request feedback',
      description: 'Email client with thank-you note and link to feedback survey',
      category: 'post_event',
      daysOffset: 3,
      dependsOnIndex: null,
      sortOrder: 12,
    },
  ],
};

/**
 * Large Event / Wedding Template (14 tasks)
 * Elaborate events with vendor coordination
 */
export const largeEventTemplate: TemplateWithItems = {
  template: {
    name: 'Large Event / Wedding',
    description:
      'Elaborate events with vendor coordination - includes tasting, vendor sync, and extended timeline',
  },
  items: [
    // PRE-EVENT
    {
      title: 'Initial menu tasting with client',
      description: 'Schedule and conduct menu tasting session with client',
      category: 'pre_event',
      daysOffset: -30,
      dependsOnIndex: null,
      sortOrder: 1,
    },
    {
      title: 'Confirm guest count and dietary restrictions',
      description: 'Get final headcount, seating chart, and all dietary requirements',
      category: 'pre_event',
      daysOffset: -14,
      dependsOnIndex: 1,
      sortOrder: 2,
    },
    {
      title: 'Finalize menu and presentation style',
      description: 'Lock in all courses, plating style, and service format',
      category: 'pre_event',
      daysOffset: -10,
      dependsOnIndex: 2,
      sortOrder: 3,
    },
    {
      title: 'Order specialty ingredients',
      description: 'Source premium and specialty items for the menu',
      category: 'pre_event',
      daysOffset: -10,
      dependsOnIndex: 3,
      sortOrder: 4,
    },
    {
      title: 'Coordinate with other vendors',
      description: 'Sync with florist, DJ, photographer on timeline and space needs',
      category: 'pre_event',
      daysOffset: -7,
      dependsOnIndex: null,
      sortOrder: 5,
    },
    {
      title: 'Confirm staffing and assign roles',
      description: 'Finalize staff schedule, assign specific stations and responsibilities',
      category: 'pre_event',
      daysOffset: -5,
      dependsOnIndex: null,
      sortOrder: 6,
    },
    {
      title: 'Prep cold items and sauces',
      description: 'Prepare all make-ahead components, sauces, and cold appetizers',
      category: 'pre_event',
      daysOffset: -2,
      dependsOnIndex: 4,
      sortOrder: 7,
    },
    {
      title: 'Final venue walkthrough and setup plan',
      description: 'Walk through venue with coordinator, confirm all logistics',
      category: 'pre_event',
      daysOffset: -1,
      dependsOnIndex: 5,
      sortOrder: 8,
    },
    // DURING-EVENT
    {
      title: 'Load vehicles and transport',
      description: 'Load all equipment, prepared food, and supplies for transport',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 7,
      sortOrder: 9,
    },
    {
      title: 'Kitchen setup and final prep',
      description: 'Set up kitchen area, complete final food preparation',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 9,
      sortOrder: 10,
    },
    {
      title: 'Service execution',
      description: 'Execute full service from cocktail hour through dinner and dessert',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 10,
      sortOrder: 11,
    },
    {
      title: 'Breakdown and cleanup',
      description: 'Complete breakdown, pack equipment, restore venue to original state',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 11,
      sortOrder: 12,
    },
    // POST-EVENT
    {
      title: 'Return rentals and inventory check',
      description: 'Return all rental equipment, reconcile inventory',
      category: 'post_event',
      daysOffset: 1,
      dependsOnIndex: 12,
      sortOrder: 13,
    },
    {
      title: 'Client follow-up and review request',
      description: 'Send personalized thank-you, request testimonial and referrals',
      category: 'post_event',
      daysOffset: 3,
      dependsOnIndex: null,
      sortOrder: 14,
    },
  ],
};

/**
 * Simple Delivery Template (8 tasks)
 * Drop-off catering with minimal setup
 */
export const simpleDeliveryTemplate: TemplateWithItems = {
  template: {
    name: 'Simple Delivery',
    description:
      'Drop-off catering with minimal setup - ideal for corporate lunches and small gatherings',
  },
  items: [
    // PRE-EVENT
    {
      title: 'Confirm order details and delivery time',
      description: 'Verify menu items, quantities, delivery address, and arrival time',
      category: 'pre_event',
      daysOffset: -3,
      dependsOnIndex: null,
      sortOrder: 1,
    },
    {
      title: 'Order supplies',
      description: 'Order ingredients and any disposable serviceware needed',
      category: 'pre_event',
      daysOffset: -2,
      dependsOnIndex: 1,
      sortOrder: 2,
    },
    {
      title: 'Prep and package food',
      description: 'Prepare all food items and package for transport',
      category: 'pre_event',
      daysOffset: -1,
      dependsOnIndex: 2,
      sortOrder: 3,
    },
    {
      title: 'Confirm delivery address and contact',
      description: 'Verify delivery location, parking, and on-site contact person',
      category: 'pre_event',
      daysOffset: -1,
      dependsOnIndex: null,
      sortOrder: 4,
    },
    // DURING-EVENT
    {
      title: 'Load and deliver',
      description: 'Load vehicle and deliver to location on time',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 3,
      sortOrder: 5,
    },
    {
      title: 'Set up display',
      description: 'Arrange food on tables/stations if setup is included',
      category: 'during_event',
      daysOffset: 0,
      dependsOnIndex: 5,
      sortOrder: 6,
    },
    // POST-EVENT
    {
      title: 'Pick up equipment',
      description: 'Retrieve any equipment or serving items left on-site',
      category: 'post_event',
      daysOffset: 1,
      dependsOnIndex: null,
      sortOrder: 7,
    },
    {
      title: 'Invoice and follow-up',
      description: 'Send invoice and brief follow-up to thank client',
      category: 'post_event',
      daysOffset: 2,
      dependsOnIndex: null,
      sortOrder: 8,
    },
  ],
};

/**
 * All templates for seeding
 */
export const allTemplates: TemplateWithItems[] = [
  standardEventTemplate,
  largeEventTemplate,
  simpleDeliveryTemplate,
];
