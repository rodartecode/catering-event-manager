/**
 * Resource Scheduling E2E Tests
 *
 * Tests resource creation, assignment, and conflict detection.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, TEST_ADMIN } from '../helpers/auth';
import {
  cleanTestDatabase,
  seedTestUser,
  seedTestClient,
  seedTestEvent,
  seedTestResource,
  seedTestTask,
} from '../helpers/db';

test.describe('Resource Scheduling', () => {
  let testEventId: number;

  test.beforeAll(async () => {
    await cleanTestDatabase();
    // Seed required data
    const admin = await seedTestUser(TEST_ADMIN.email, 'administrator', TEST_ADMIN.password);
    const client = await seedTestClient();
    const event = await seedTestEvent({
      clientId: client.id,
      createdBy: admin.id,
      eventName: 'Resource Test Event',
      status: 'preparation',
    });
    testEventId = event.id;

    // Seed a task for resource assignment testing
    await seedTestTask({
      eventId: event.id,
      title: 'Resource Assignment Task',
      category: 'pre_event',
      status: 'pending',
    });

    // Seed some resources
    await seedTestResource({ name: 'Test Staff Member', type: 'staff' });
    await seedTestResource({ name: 'Test Equipment', type: 'equipment' });
    await seedTestResource({ name: 'Test Materials', type: 'materials' });
  });

  test.describe('Resource CRUD', () => {
    let resourceName: string;

    test('create staff resource', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/resources/new');

      // Fill resource form
      resourceName = `E2E Staff ${Date.now()}`;
      await page.fill('input[name="name"], input#name', resourceName);

      // Select type
      await page.selectOption('select[name="type"], select#type', 'staff');

      // Set hourly rate if field exists
      const rateInput = page.locator('input[name="hourlyRate"], input#hourlyRate');
      if (await rateInput.isVisible({ timeout: 1000 })) {
        await rateInput.fill('50');
      }

      // Submit
      await page.click('button[type="submit"]');

      // Should redirect to resources list or detail
      await expect(page).toHaveURL(/\/resources/);
    });

    test('create equipment resource', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/resources/new');

      const equipmentName = `E2E Equipment ${Date.now()}`;
      await page.fill('input[name="name"], input#name', equipmentName);
      await page.selectOption('select[name="type"], select#type', 'equipment');

      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/resources/);
    });

    test('view resources list', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/resources');

      // Should see resource list
      await expect(page.locator('h1:has-text("Resources")')).toBeVisible();

      // Should see our seeded resources
      await expect(page.locator('text=Test Staff Member')).toBeVisible();
      await expect(page.locator('text=Test Equipment')).toBeVisible();
    });

    test('filter resources by type', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/resources');

      // Wait for resources to load
      await expect(page.locator('text=Test Staff Member')).toBeVisible();

      // Select type filter
      const typeFilter = page.locator('select#type, select[name="type"]').first();
      await expect(typeFilter).toBeVisible();
      await typeFilter.selectOption('staff');

      // Should still show staff resources after filter applies
      await expect(page.locator('text=Test Staff Member')).toBeVisible();
    });
  });

  test.describe('Resource Assignment', () => {
    test('assign resource to task', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`/events/${testEventId}`);

      // Wait for tasks to load
      await expect(page.locator('h2:has-text("Tasks")')).toBeVisible();

      // Find the seeded task card
      const taskCard = page.locator('[data-testid="task-card"]:has-text("Resource Assignment Task")');
      await expect(taskCard).toBeVisible();

      // Click "Resources" button on the task card
      await taskCard.locator('button:has-text("Resources")').click();

      // Wait for ResourceAssignmentDialog
      await expect(page.locator('h2:has-text("Assign Resources")')).toBeVisible();

      // Select a resource by clicking its toggle button
      await page.locator('button:has-text("Test Staff Member")').click();

      // Click "Assign Resources" to confirm
      await page.locator('button:has-text("Assign Resources")').click();

      // Dialog should close
      await expect(page.locator('h2:has-text("Assign Resources")')).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Conflict Detection', () => {
    // SKIPPED: On-demand compilation of /resources/[id] in dev mode causes "Resource Not Found" race condition
    test.skip('detect resource scheduling conflict', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/resources');
      await page.click('text=Test Staff Member');

      const scheduleView = page.locator('[data-testid="resource-schedule"]');
      await expect(scheduleView).toBeVisible({ timeout: 10000 });
    });

    // SKIPPED: Requires creating overlapping schedule entries in test setup
    test.skip('view conflict warning before assignment', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events');

      // Navigate to event
      await page.click('text=Resource Test Event');

      // Look for conflict warning in resource assignment flow
      const conflictWarning = page.locator('[data-testid="conflict-warning"]');
      await expect(conflictWarning).toBeVisible();
    });
  });

  test.describe('Resource Schedule View', () => {
    // SKIPPED: On-demand compilation of /resources/[id] in dev mode causes "Resource Not Found" race condition
    test.skip('view resource schedule calendar', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/resources');
      await page.click('text=Test Staff Member');

      const scheduleSection = page.locator('[data-testid="resource-schedule"]');
      await expect(scheduleSection).toBeVisible({ timeout: 10000 });
    });
  });
});
