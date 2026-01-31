/**
 * Client Communication E2E Tests
 *
 * Tests client management, communication recording, and follow-ups.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, TEST_ADMIN } from '../helpers/auth';
import { cleanTestDatabase, seedTestUser, seedTestClient, seedTestEvent } from '../helpers/db';

test.describe('Client Communication', () => {
  test.beforeAll(async () => {
    await cleanTestDatabase();
    // Seed required data
    const adminUser = await seedTestUser(TEST_ADMIN.email, 'administrator', TEST_ADMIN.password);
    const client = await seedTestClient({
      companyName: 'Communication Test Company',
      contactName: 'Test Contact',
      email: 'comms@test.com',
      phone: '555-0123',
    });
    // CommunicationForm only renders when the client has events
    await seedTestEvent({
      clientId: client.id,
      createdBy: adminUser.id,
      eventName: 'Communication Test Event',
      status: 'planning',
    });
  });

  test.describe('Client CRUD', () => {
    let clientName: string;

    test('create new client', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/clients/new');

      // Fill client form
      clientName = `E2E Client ${Date.now()}`;
      await page.fill('input[name="companyName"], input#companyName', clientName);
      await page.fill('input[name="contactName"], input#contactName', 'John Doe');
      await page.fill('input[name="email"], input#email', `client-${Date.now()}@test.com`);
      await page.fill('input[name="phone"], input#phone', '555-9999');

      // Submit
      await page.click('button[type="submit"]');

      // Should redirect to clients list or detail
      await expect(page).toHaveURL(/\/clients/);
    });

    test('view client in list', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/clients');

      // Should see our seeded client
      await expect(page.locator('text=Communication Test Company')).toBeVisible();
    });

    test('view client details', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/clients');

      // Click on client
      await page.click('text=Communication Test Company');

      // Should see client details
      await expect(page.locator('text=Communication Test Company')).toBeVisible();
      await expect(page.locator('text=Test Contact')).toBeVisible();
    });
  });

  test.describe('Communication Recording', () => {
    test('record phone call communication', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/clients');

      // Navigate to client detail page
      await page.click('text=Communication Test Company');

      // Click the "Record New Communication" button
      await page.click('button:has-text("Record New Communication")');

      // Wait for form to be visible
      await expect(page.locator('form')).toBeVisible();

      // Select an event (required for CommunicationForm)
      await page.selectOption('select#event', { index: 1 });

      // Select communication type
      await page.selectOption('select#type', 'phone');

      // Fill notes
      await page.fill('textarea#notes', 'Discussed event requirements');

      // Submit
      await page.click('button:has-text("Save Communication")');

      // Communication should appear in list
      await expect(page.locator('text=Discussed event requirements')).toBeVisible({ timeout: 5000 });
    });

    test('record email communication', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/clients');
      await page.click('text=Communication Test Company');

      // Click the "Record New Communication" button
      await page.click('button:has-text("Record New Communication")');

      // Wait for form to be visible
      await expect(page.locator('form')).toBeVisible();

      // Select an event (required for CommunicationForm)
      await page.selectOption('select#event', { index: 1 });

      // Select communication type
      await page.selectOption('select#type', 'email');

      // Fill notes
      await page.fill('textarea#notes', 'Sent quote via email');

      // Submit
      await page.click('button:has-text("Save Communication")');

      // Communication should appear in list
      await expect(page.locator('text=Sent quote via email')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Follow-up Management', () => {
    test('schedule follow-up', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/clients');
      await page.click('text=Communication Test Company');

      // Click the "Record New Communication" button
      await page.click('button:has-text("Record New Communication")');

      // Wait for form to be visible
      await expect(page.locator('form')).toBeVisible();

      // Select an event (required for CommunicationForm)
      await page.selectOption('select#event', { index: 1 });

      // Select communication type
      await page.selectOption('select#type', 'phone');

      // Fill notes
      await page.fill('textarea#notes', 'Follow up on quote');

      // Set follow-up date (future date)
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 2);
      await page.fill('input#followUpDate', followUpDate.toISOString().split('T')[0]);

      // Submit
      await page.click('button:has-text("Save Communication")');

      // Communication with follow-up should appear in list
      await expect(page.locator('text=Follow up on quote')).toBeVisible({ timeout: 5000 });
    });

    test('view pending follow-ups', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/clients');
      await page.click('text=Communication Test Company');

      // The Communications tab (default) shows a Pending Follow-ups section
      // when communications with follow-up dates exist
      const followUpSection = page.locator('[data-testid="follow-ups"]');
      await expect(followUpSection).toBeVisible({ timeout: 10000 });
      await expect(followUpSection.locator('text=Pending Follow-ups')).toBeVisible();
    });

    // SKIPPED: Requires seeding communication with follow-up in test setup
    test.skip('complete follow-up', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/clients');
      await page.click('text=Communication Test Company');

      // CommunicationList has "Mark Follow-Up Complete" button
      const completeButton = page.locator('button:has-text("Mark Follow-Up Complete")');
      await expect(completeButton.first()).toBeVisible({ timeout: 5000 });
      await completeButton.first().click();

      // Follow-up should be marked complete
      await expect(page.locator('text=Completed')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Client Event History', () => {
    test('view client event history', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/clients');
      await page.click('text=Communication Test Company');

      // Click the "Events" tab (default tab is "communications")
      await page.click('button:has-text("Events")');

      // Events section should be visible
      await expect(page.locator('[data-testid="client-events"]')).toBeVisible({ timeout: 5000 });
    });
  });
});
