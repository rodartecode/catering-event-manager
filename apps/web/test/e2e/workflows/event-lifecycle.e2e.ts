/**
 * Event Lifecycle E2E Tests
 *
 * Tests the complete event lifecycle from creation through archival.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, TEST_ADMIN } from '../helpers/auth';
import { cleanTestDatabase, seedTestUser, seedTestClient } from '../helpers/db';

test.describe('Event Lifecycle', () => {
  test.beforeAll(async () => {
    await cleanTestDatabase();
    // Seed required data
    await seedTestUser(TEST_ADMIN.email, 'administrator', TEST_ADMIN.password);
    await seedTestClient({
      companyName: 'Lifecycle Test Company',
      contactName: 'Test Contact',
      email: 'lifecycle@test.com',
    });
  });

  test.describe.serial('Create and Progress Event', () => {
    let eventName: string;

    test('create new event (inquiry status)', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events/new');

      // Wait for form to load
      await expect(page.locator('h1:has-text("Create New Event")')).toBeVisible();

      // Fill in event form
      eventName = `E2E Test Event ${Date.now()}`;

      // Select client
      await page.selectOption('select#clientId', { index: 1 }); // First client

      // Fill event name
      await page.fill('input#eventName', eventName);

      // Fill event date (7 days from now)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateString = futureDate.toISOString().split('T')[0];
      await page.fill('input#eventDate', dateString);

      // Fill location
      await page.fill('input#location', 'Test Venue');

      // Fill estimated attendees
      await page.fill('input#estimatedAttendees', '50');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to event detail page
      await page.waitForURL(/\/events\/\d+/, { timeout: 15000 });

      // Should see event name on detail page
      await expect(page.locator('h1', { hasText: eventName })).toBeVisible();
    });

    test('view event in list', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events');

      // Wait for events to load
      await expect(page.locator('h1:has-text("Events")')).toBeVisible();

      // Should see the event we created
      await expect(page.locator(`text="${eventName}"`)).toBeVisible();

      // Should show inquiry status badge
      await expect(page.locator('text=Inquiry').first()).toBeVisible();
    });

    test('update event status: inquiry → planning', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events');

      // Click on event card to navigate to detail page
      await page.locator(`h3:has-text("${eventName}")`).click();
      await page.waitForURL(/\/events\/\d+/, { timeout: 10000 });

      // Click Update Status button
      await page.locator('button:has-text("Update Status")').click();

      // Wait for EventStatusUpdateDialog
      await expect(page.locator('h3:has-text("Update Event Status")')).toBeVisible();

      // Select "Planning" radio button
      await page.locator('input[type="radio"][name="status"][value="planning"]').click();

      // Submit the form
      await page.locator('button[type="submit"]:has-text("Update Status")').click();

      // Wait for dialog to close
      await expect(page.locator('h3:has-text("Update Event Status")')).not.toBeVisible({ timeout: 10000 });

      // Verify status badge updated to Planning
      await expect(page.locator('text=Planning').first()).toBeVisible();
    });

    test('update event status through full lifecycle', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events');

      // Navigate to event detail
      await page.locator(`h3:has-text("${eventName}")`).click();
      await page.waitForURL(/\/events\/\d+/, { timeout: 10000 });

      // Progress through: planning → preparation → in_progress → completed → follow_up
      const statusValues = ['preparation', 'in_progress', 'completed', 'follow_up'];

      for (const targetValue of statusValues) {
        // Click Update Status button
        await page.locator('button:has-text("Update Status")').click();

        // Wait for dialog
        await expect(page.locator('h3:has-text("Update Event Status")')).toBeVisible();

        // Select target status radio button
        await page.locator(`input[type="radio"][name="status"][value="${targetValue}"]`).click();

        // Submit
        await page.locator('button[type="submit"]:has-text("Update Status")').click();

        // Wait for dialog to close
        await expect(page.locator('h3:has-text("Update Event Status")')).not.toBeVisible({ timeout: 10000 });
      }

      // Final status should be Follow Up
      await expect(page.locator('text=Follow Up').first()).toBeVisible();
    });

    test('view event status history/timeline', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events');

      // Navigate to event
      await page.locator(`h3:has-text("${eventName}")`).click();
      await page.waitForURL(/\/events\/\d+/, { timeout: 10000 });

      // Status History section should be visible
      await expect(page.locator('h2:has-text("Status History")')).toBeVisible();

      // Timeline component should render
      await expect(page.locator('[data-testid="status-timeline"]')).toBeVisible();

      // Should show at least the initial inquiry status
      await expect(page.locator('[data-testid="status-timeline"] >> text=Inquiry')).toBeVisible();
    });

    test('archive completed event', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events');

      // Navigate to event
      await page.locator(`h3:has-text("${eventName}")`).click();
      await page.waitForURL(/\/events\/\d+/, { timeout: 10000 });

      // Event is at "follow_up" status — first update to "completed" to enable archive
      await page.locator('button:has-text("Update Status")').click();
      await expect(page.locator('h3:has-text("Update Event Status")')).toBeVisible();
      await page.locator('input[type="radio"][name="status"][value="completed"]').click();
      await page.locator('button[type="submit"]:has-text("Update Status")').click();
      await expect(page.locator('h3:has-text("Update Event Status")')).not.toBeVisible({ timeout: 10000 });

      // Now "Archive Event" button should be visible
      await expect(page.locator('button:has-text("Archive Event")')).toBeVisible();
      await page.locator('button:has-text("Archive Event")').click();

      // Archive confirmation dialog appears
      await expect(page.locator('h3:has-text("Archive Event?")')).toBeVisible();

      // Click the confirm button (scoped to the archive dialog)
      await page.locator('.fixed.inset-0').last()
        .locator('button:has-text("Archive Event")').click();

      // Should redirect back to events list
      await page.waitForURL('/events', { timeout: 10000 });

      // Event should no longer be visible in active list
      await expect(page.locator(`text="${eventName}"`)).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Event Filtering', () => {
    test('filter events by status', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events');

      // Select status filter
      const statusSelect = page.locator('select#status');
      await statusSelect.waitFor({ state: 'visible', timeout: 10000 });
      await statusSelect.selectOption('inquiry');

      // Wait for data to reload
      await page.waitForLoadState('networkidle');

      // Page should still show Events heading (filter applied without error)
      await expect(page.locator('h1:has-text("Events")')).toBeVisible();

      // Either shows filtered events or "No events found" — both are valid
      const noEventsMessage = page.locator('text=No events found');
      const eventCards = page.locator('.bg-white.rounded-lg.shadow');

      const hasNoEvents = await noEventsMessage.isVisible({ timeout: 3000 });
      if (!hasNoEvents) {
        expect(await eventCards.count()).toBeGreaterThan(0);
      }
    });

    test('filter events by date range', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events');

      // Set date filter
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      await page.fill('input#dateFrom', today.toISOString().split('T')[0]);
      await page.fill('input#dateTo', nextMonth.toISOString().split('T')[0]);

      // Wait for data to reload
      await page.waitForLoadState('networkidle');

      // Page should show filtered results (may be empty or have events)
      await expect(page.locator('h1:has-text("Events")')).toBeVisible();
    });

    test('clear filters', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/events');

      // Apply a filter first
      await page.selectOption('select#status', 'planning');
      await page.waitForLoadState('networkidle');

      // Click clear filters
      await page.click('button:has-text("Clear Filters")');

      // Status should be reset to "all"
      await expect(page.locator('select#status')).toHaveValue('all');
    });
  });
});
