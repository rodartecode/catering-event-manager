/**
 * E2E Test Authentication Helpers
 *
 * Provides functions for logging in and managing auth state in tests.
 */

import path from 'node:path';
import { users } from '@catering-event-manager/database/schema';
import type { BrowserContext, Page } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { db, seedTestUser } from './db';

// Auth state storage paths
const AUTH_DIR = path.join(process.cwd(), '.playwright', 'auth');
export const ADMIN_AUTH_FILE = path.join(AUTH_DIR, 'admin.json');
export const MANAGER_AUTH_FILE = path.join(AUTH_DIR, 'manager.json');

// Test credentials
export const TEST_ADMIN = {
  email: 'admin@test.com',
  password: 'testpass123',
};

export const TEST_MANAGER = {
  email: 'manager@test.com',
  password: 'testpass123',
};

/**
 * Login via the UI
 * Use this for auth workflow tests or initial auth state setup
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  // Retry login up to 3 times — the Next.js dev server may still be compiling
  // routes on first request, causing the signIn() call or hydration to fail.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login');

    // Wait for the login form to be fully rendered and interactive
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for Next.js Turbopack compilation to finish.
    // The "Compiling" indicator means React hasn't hydrated the event handlers yet.
    // Poll until the compiling indicator is gone or shows "Compiled".
    await page
      .waitForFunction(
        () => {
          const body = document.body.innerText;
          return !body.includes('Compiling');
        },
        { timeout: 60000, polling: 1000 }
      )
      .catch(() => {});

    // Wait for React hydration after compilation
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="email"], input[type="email"]', email);
    await page.fill('input[name="password"], input[type="password"]', password);
    await submitButton.click();

    // Wait for redirect to dashboard
    try {
      await page.waitForURL('/', { timeout: 20000 });
      return; // Success
    } catch {
      // Login didn't redirect — may still be compiling. Retry.
      if (attempt === 3) {
        throw new Error(
          `Login failed after ${attempt} attempts. Page URL: ${page.url()}. Next.js dev server may still be compiling.`
        );
      }
      // Wait for the dev server to finish compiling before retrying
      await page.waitForLoadState('load');
    }
  }
}

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  // Ensure admin user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, TEST_ADMIN.email),
  });

  if (!existingUser) {
    await seedTestUser(TEST_ADMIN.email, 'administrator', TEST_ADMIN.password);
  }

  await login(page, TEST_ADMIN.email, TEST_ADMIN.password);
}

/**
 * Login as manager user
 */
export async function loginAsManager(page: Page): Promise<void> {
  // Ensure manager user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, TEST_MANAGER.email),
  });

  if (!existingUser) {
    await seedTestUser(TEST_MANAGER.email, 'manager', TEST_MANAGER.password);
  }

  await login(page, TEST_MANAGER.email, TEST_MANAGER.password);
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');

  // Remove Next.js dev tools overlay that covers the UserMenu in the bottom-left corner
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('nextjs-portal')) el.remove();
  });

  // Open user menu dropdown
  const userMenuButton = page.locator('[data-testid="user-menu"]');
  await userMenuButton.waitFor({ state: 'visible', timeout: 10000 });
  await userMenuButton.click();

  // Wait for dropdown to appear, then click sign out
  const signOutButton = page.locator('button:has-text("Sign out")');
  await signOutButton.waitFor({ state: 'visible', timeout: 5000 });
  await signOutButton.click();

  // Wait for redirect to login page
  await page.waitForURL('/login', { timeout: 15000 });
}

/**
 * Setup authentication state for faster tests
 * Run this in global setup to pre-authenticate users
 */
export async function setupAuthState(context: BrowserContext): Promise<void> {
  const page = await context.newPage();

  // Ensure test users exist (seedTestData may have already created them)
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, TEST_ADMIN.email),
  });
  if (!existingAdmin) {
    await seedTestUser(TEST_ADMIN.email, 'administrator', TEST_ADMIN.password);
  }

  const existingManager = await db.query.users.findFirst({
    where: eq(users.email, TEST_MANAGER.email),
  });
  if (!existingManager) {
    await seedTestUser(TEST_MANAGER.email, 'manager', TEST_MANAGER.password);
  }

  // Login as admin and save state
  await login(page, TEST_ADMIN.email, TEST_ADMIN.password);
  await context.storageState({ path: ADMIN_AUTH_FILE });

  // Logout and login as manager
  await logout(page);
  await login(page, TEST_MANAGER.email, TEST_MANAGER.password);
  await context.storageState({ path: MANAGER_AUTH_FILE });

  await page.close();
}

/**
 * Check if user is authenticated by looking for dashboard elements
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check for common authenticated UI elements
    const sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('nav').first());
    return await sidebar.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Get the current user's role from the page
 */
export async function getCurrentUserRole(page: Page): Promise<string | null> {
  try {
    // This assumes the user menu displays the role
    const userMenu = page.locator('[data-testid="user-role"]');
    if (await userMenu.isVisible({ timeout: 2000 })) {
      return await userMenu.textContent();
    }
    return null;
  } catch {
    return null;
  }
}
