/**
 * Client Portal Workflow E2E Tests
 *
 * Tests the complete client portal experience:
 * - Magic link authentication
 * - Dashboard access
 * - Event viewing
 * - Data isolation (clients only see their own data)
 */

import { test, expect } from '@playwright/test';
import {
  cleanTestDatabase,
  seedPortalTestData,
  seedTestEvent,
  seedTestClient,
  createMagicLinkToken,
} from '../helpers/db';
import { TEST_ADMIN, login } from '../helpers/auth';

test.describe('Client Portal Workflow', () => {
  let portalData: Awaited<ReturnType<typeof seedPortalTestData>>;

  test.beforeAll(async () => {
    await cleanTestDatabase();
    portalData = await seedPortalTestData();
  });

  test.describe('Portal Access', () => {
    test('portal login page is accessible', async ({ page }) => {
      await page.goto('/portal/login');

      // Should show portal login form
      await expect(page.locator('h1, h2')).toContainText(/portal|login/i);
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('portal redirects unauthenticated users to login', async ({ page }) => {
      await page.goto('/portal');

      // Should redirect to portal login
      await expect(page).toHaveURL(/\/portal\/login/);
    });

    test('portal events page redirects unauthenticated users', async ({ page }) => {
      await page.goto('/portal/events');

      // Should redirect to portal login
      await expect(page).toHaveURL(/\/portal\/login/);
    });
  });

  test.describe('Magic Link Request', () => {
    test('user can request magic link', async ({ page }) => {
      await page.goto('/portal/login');

      // Fill in email
      await page.fill('input[type="email"]', portalData.client.email);

      // Submit
      await page.click('button[type="submit"]');

      // Should show success message (without revealing if email exists)
      await expect(
        page.locator('text=/check your email|magic link|email sent/i')
      ).toBeVisible({ timeout: 10000 });
    });

    test('magic link request handles unknown email gracefully', async ({ page }) => {
      await page.goto('/portal/login');

      // Fill in non-existent email
      await page.fill('input[type="email"]', 'nonexistent@example.com');

      // Submit
      await page.click('button[type="submit"]');

      // Should show same message (prevent email enumeration)
      await expect(
        page.locator('text=/check your email|magic link|email sent/i')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Authenticated Portal Access', () => {
    test('portal user can authenticate with magic link', async ({ page }) => {
      // Create a valid magic link token
      const token = await createMagicLinkToken(portalData.client.email);

      // Navigate to portal with magic link parameters
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);

      // Should redirect to portal dashboard (or show dashboard content)
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Should see welcome message or dashboard content
      await expect(
        page.locator('text=/welcome|dashboard|your events/i')
      ).toBeVisible({ timeout: 10000 });
    });

    test('portal shows client name in welcome', async ({ page }) => {
      const token = await createMagicLinkToken(portalData.client.email);
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Should show client or company info
      const pageContent = await page.textContent('body');
      const hasClientInfo =
        pageContent?.includes(portalData.client.contactName) ||
        pageContent?.includes(portalData.client.companyName);

      expect(hasClientInfo).toBe(true);
    });

    test('portal shows client events', async ({ page }) => {
      const token = await createMagicLinkToken(portalData.client.email);
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Should show the event created for this client
      await expect(page.locator(`text=${portalData.event.eventName}`)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Event Details', () => {
    test('portal user can view event details', async ({ page }) => {
      const token = await createMagicLinkToken(portalData.client.email);
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Click on the event
      await page.click(`text=${portalData.event.eventName}`);

      // Should navigate to event details
      await page.waitForURL(/\/portal\/events\/\d+/, { timeout: 10000 });

      // Should show event details
      await expect(page.locator(`text=${portalData.event.eventName}`)).toBeVisible();
    });

    test('event details show status', async ({ page }) => {
      const token = await createMagicLinkToken(portalData.client.email);
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Navigate to event details
      await page.click(`text=${portalData.event.eventName}`);
      await page.waitForURL(/\/portal\/events\/\d+/, { timeout: 10000 });

      // Should show event status (planning)
      await expect(page.locator('text=/planning/i')).toBeVisible();
    });
  });

  test.describe('Data Isolation', () => {
    test('portal user cannot see other clients events', async ({ page }) => {
      // Create another client with different events
      const otherClient = await seedTestClient({
        companyName: 'Other Company LLC',
        contactName: 'Other Person',
        email: 'other@company.test',
      });

      await seedTestEvent({
        clientId: otherClient.id,
        createdBy: portalData.adminUser.id,
        eventName: 'Secret Event from Other Client',
        status: 'inquiry',
      });

      // Login as the original portal user
      const token = await createMagicLinkToken(portalData.client.email);
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Should NOT see the other client's event
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toContain('Secret Event from Other Client');

      // But should still see own event
      await expect(page.locator(`text=${portalData.event.eventName}`)).toBeVisible();
    });

    test('portal user cannot access other client event by URL', async ({ page }) => {
      // Create another client with an event
      const otherClient = await seedTestClient({
        companyName: 'Competitor Corp',
        contactName: 'Competitor Person',
        email: 'competitor@corp.test',
      });

      const otherEvent = await seedTestEvent({
        clientId: otherClient.id,
        createdBy: portalData.adminUser.id,
        eventName: 'Competitor Secret Event',
        status: 'inquiry',
      });

      // Login as the original portal user
      const token = await createMagicLinkToken(portalData.client.email);
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Try to access the other client's event directly
      await page.goto(`/portal/events/${otherEvent.id}`);

      // Should show error or redirect (not show the event)
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toContain('Competitor Secret Event');

      // Should show error or redirect to portal
      const url = page.url();
      const showsError = pageContent?.toLowerCase().includes('not found') ||
        pageContent?.toLowerCase().includes('access denied') ||
        pageContent?.toLowerCase().includes('error');
      const redirected = !url.includes(`/portal/events/${otherEvent.id}`);

      expect(showsError || redirected).toBe(true);
    });
  });

  test.describe('Portal vs Staff Separation', () => {
    test('portal users cannot access staff dashboard', async ({ page }) => {
      const token = await createMagicLinkToken(portalData.client.email);
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Try to access staff dashboard
      await page.goto('/');

      // Should be redirected to login or portal
      const url = page.url();
      expect(url.includes('/login') || url.includes('/portal')).toBe(true);
    });

    test('staff users cannot access portal (wrong auth type)', async ({ page }) => {
      // Login as admin (staff user)
      await login(page, TEST_ADMIN.email, TEST_ADMIN.password);

      // Try to access portal
      await page.goto('/portal');

      // Should redirect to portal login or show error
      // (staff auth doesn't work for portal)
      const url = page.url();
      const redirectedToPortalLogin = url.includes('/portal/login');
      const stillOnMainApp = !url.includes('/portal') || url === 'http://localhost:3000/portal/login';

      expect(redirectedToPortalLogin || stillOnMainApp).toBe(true);
    });
  });

  test.describe('Portal Navigation', () => {
    test('portal has navigation to events list', async ({ page }) => {
      const token = await createMagicLinkToken(portalData.client.email);
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Should have link to events
      const eventsLink = page.locator('a[href*="/portal/events"], a:has-text("Events"), a:has-text("View All")');
      await expect(eventsLink.first()).toBeVisible();
    });

    test('portal user can navigate back to dashboard from event', async ({ page }) => {
      const token = await createMagicLinkToken(portalData.client.email);
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);
      await page.waitForURL(/\/portal(?!\/login)/, { timeout: 10000 });

      // Navigate to event
      await page.click(`text=${portalData.event.eventName}`);
      await page.waitForURL(/\/portal\/events\/\d+/, { timeout: 10000 });

      // Find and click back/home link
      const backLink = page.locator('a[href="/portal"], a:has-text("Back"), a:has-text("Dashboard"), a:has-text("Home")');
      if (await backLink.count() > 0) {
        await backLink.first().click();
        await page.waitForURL(/\/portal(?:\/)?$/, { timeout: 10000 });
      } else {
        // Use browser back
        await page.goBack();
      }

      // Should be back on dashboard
      await expect(page.locator(`text=${portalData.event.eventName}`)).toBeVisible();
    });
  });

  test.describe('Expired Token Handling', () => {
    test('expired magic link shows error', async ({ page }) => {
      // Create an expired token (negative expiry)
      const token = await createMagicLinkToken(portalData.client.email, -1);

      // Try to use the expired token
      await page.goto(`/portal/login?email=${encodeURIComponent(portalData.client.email)}&token=${token}`);

      // Should stay on login page or show error
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const pageContent = await page.textContent('body');

      const isOnLogin = url.includes('/portal/login');
      const showsError = pageContent?.toLowerCase().includes('expired') ||
        pageContent?.toLowerCase().includes('invalid') ||
        pageContent?.toLowerCase().includes('error');

      expect(isOnLogin || showsError).toBe(true);
    });
  });
});
