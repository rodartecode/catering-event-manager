/**
 * Authentication Workflow E2E Tests
 *
 * Tests login, logout, and role-based access control.
 */

import { expect, test } from '@playwright/test';
import { login, logout, TEST_ADMIN, TEST_MANAGER } from '../helpers/auth';
import { checkA11y } from '../helpers/axe';
import { cleanTestDatabase, seedTestUser } from '../helpers/db';

test.describe('Authentication Workflow', () => {
  test.beforeAll(async () => {
    await cleanTestDatabase();
    // Seed test users
    await seedTestUser(TEST_ADMIN.email, 'administrator', TEST_ADMIN.password);
    await seedTestUser(TEST_MANAGER.email, 'manager', TEST_MANAGER.password);
  });

  test.describe('Login', () => {
    test('user can login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"], input[type="email"]', TEST_ADMIN.email);
      await page.fill('input[name="password"], input[type="password"]', TEST_ADMIN.password);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/');

      // Should see dashboard content
      await expect(page.locator('nav, [data-testid="sidebar"]')).toBeVisible();
    });

    test('user sees error with invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"], input[type="email"]', 'wrong@test.com');
      await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should stay on login page
      await expect(page).toHaveURL('/login');

      // LoginForm renders error in a red alert box (div.bg-red-50)
      const errorMessage = page.locator('.bg-red-50, .text-red-800');
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('user sees error with empty fields', async ({ page }) => {
      await page.goto('/login');

      // Click submit without filling in fields
      await page.click('button[type="submit"]');

      // Should stay on login page — HTML5 required validation or Zod field errors prevent navigation
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Logout', () => {
    test('user can logout', async ({ page }) => {
      // Login first
      await login(page, TEST_ADMIN.email, TEST_ADMIN.password);

      // Verify we're logged in
      await expect(page).toHaveURL('/');

      // Logout
      await logout(page);

      // Should redirect to login page
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Role-based Access', () => {
    test('admin can access all dashboard pages', async ({ page }) => {
      await login(page, TEST_ADMIN.email, TEST_ADMIN.password);

      // Navigate to each main section
      const sections = ['/events', '/clients', '/resources', '/analytics'];

      for (const section of sections) {
        await page.goto(section);
        await expect(page).toHaveURL(section);
        // Should not see access denied
        await expect(page.locator('text=Access Denied')).not.toBeVisible();
        await expect(page.locator('text=Unauthorized')).not.toBeVisible();
      }
    });

    test('manager can access dashboard pages', async ({ page }) => {
      await login(page, TEST_MANAGER.email, TEST_MANAGER.password);

      // Managers should be able to view pages
      await page.goto('/events');
      await expect(page).toHaveURL('/events');

      await page.goto('/clients');
      await expect(page).toHaveURL('/clients');

      await page.goto('/resources');
      await expect(page).toHaveURL('/resources');

      await page.goto('/analytics');
      await expect(page).toHaveURL('/analytics');
    });

    test('unauthenticated user is redirected to login', async ({ page }) => {
      // Try to access protected pages without logging in
      const protectedPages = ['/', '/events', '/clients', '/resources', '/analytics'];

      for (const protectedPage of protectedPages) {
        await page.goto(protectedPage);
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
      }
    });
  });

  test.describe('Session Persistence', () => {
    test('session persists across page refreshes', async ({ page }) => {
      await login(page, TEST_ADMIN.email, TEST_ADMIN.password);

      // Verify logged in
      await expect(page).toHaveURL('/');

      // Refresh the page
      await page.reload();

      // Should still be logged in (not redirected to login)
      await expect(page).toHaveURL('/');
      await expect(page.locator('nav, [data-testid="sidebar"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('login page is accessible', async ({ page }) => {
      await page.goto('/login');
      await checkA11y(page);
    });

    test('dashboard is accessible after login', async ({ page }) => {
      await login(page, TEST_ADMIN.email, TEST_ADMIN.password);
      await expect(page).toHaveURL('/');
      await checkA11y(page);
    });
  });
});
