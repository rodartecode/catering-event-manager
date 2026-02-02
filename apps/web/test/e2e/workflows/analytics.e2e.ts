/**
 * Analytics E2E Tests
 *
 * Tests analytics dashboard loading and data visualization.
 */

import { expect, test } from '@playwright/test';
import { loginAsAdmin, TEST_ADMIN } from '../helpers/auth';
import {
  cleanTestDatabase,
  seedTestClient,
  seedTestEvent,
  seedTestResource,
  seedTestUser,
} from '../helpers/db';

test.describe('Analytics Dashboard', () => {
  test.beforeAll(async () => {
    await cleanTestDatabase();
    // Seed data for analytics
    const admin = await seedTestUser(TEST_ADMIN.email, 'administrator', TEST_ADMIN.password);
    const client = await seedTestClient();

    // Create multiple events with different statuses for analytics data
    await seedTestEvent({
      clientId: client.id,
      createdBy: admin.id,
      eventName: 'Completed Event',
      status: 'completed',
    });
    await seedTestEvent({
      clientId: client.id,
      createdBy: admin.id,
      eventName: 'In Progress Event',
      status: 'in_progress',
    });
    await seedTestEvent({
      clientId: client.id,
      createdBy: admin.id,
      eventName: 'Planning Event',
      status: 'planning',
    });

    // Create resources for utilization data
    await seedTestResource({ name: 'Analytics Staff', type: 'staff' });
    await seedTestResource({ name: 'Analytics Equipment', type: 'equipment' });
  });

  test('analytics page loads successfully', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/analytics');

    // Page should load without errors
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible();

    // Should not show error state
    await expect(page.locator('text=Error')).not.toBeVisible();
  });

  test('event completion chart displays data', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/analytics');

    // Chart container should be visible
    await expect(page.locator('[data-testid="event-completion-chart"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('resource utilization chart displays data', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/analytics');

    // Resource utilization chart should be visible
    await expect(page.locator('[data-testid="resource-utilization"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('task performance chart displays data', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/analytics');

    // Task performance chart should be visible
    await expect(page.locator('[data-testid="task-performance"]')).toBeVisible({ timeout: 10000 });
  });

  test('filter analytics by date range', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/analytics');

    // Wait for page to load
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible();

    // Use the DateRangePicker custom inputs
    const dateFromInput = page.locator('#date-from');
    const dateToInput = page.locator('#date-to');

    await expect(dateFromInput).toBeVisible();

    // Set date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    await dateFromInput.fill(startDate.toISOString().split('T')[0]);
    await dateToInput.fill(endDate.toISOString().split('T')[0]);

    // Click Apply to trigger the date range change
    await page.locator('button:has-text("Apply")').click();

    // Wait for charts to re-render with new data
    await page.waitForLoadState('networkidle');

    // Page should still be functional
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible();
  });

  test('analytics shows empty state when no data', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/analytics');

    // Wait for page to load
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible();

    const dateFromInput = page.locator('#date-from');
    await expect(dateFromInput).toBeVisible();

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    await dateFromInput.fill(futureDate.toISOString().split('T')[0]);

    // Click Apply to trigger the date range change
    await page.locator('button:has-text("Apply")').click();

    // Wait for data update
    await page.waitForLoadState('networkidle');

    // Should show empty state or zero values (not error)
    const errorMessage = page.locator('text=Error loading');
    await expect(errorMessage).not.toBeVisible();
  });

  test('analytics cards show KPIs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/analytics');

    // Analytics cards should be visible (page always renders 4 KPI cards)
    const analyticsCards = page.locator('[data-testid="analytics-card"]');
    await expect(analyticsCards.first()).toBeVisible({ timeout: 10000 });

    // Should have 4 KPI cards
    const count = await analyticsCards.count();
    expect(count).toBe(4);
  });
});
