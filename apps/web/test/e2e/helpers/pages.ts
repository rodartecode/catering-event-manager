/**
 * E2E Test Page Helpers
 *
 * Common selectors and interaction helpers for page navigation and forms.
 */

import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Navigation selectors
 */
export const nav = {
  sidebar: '[data-testid="sidebar"], nav.sidebar, aside',
  dashboard: 'a[href="/"], a:has-text("Dashboard")',
  events: 'a[href="/events"], a:has-text("Events")',
  clients: 'a[href="/clients"], a:has-text("Clients")',
  resources: 'a[href="/resources"], a:has-text("Resources")',
  analytics: 'a[href="/analytics"], a:has-text("Analytics")',
  userMenu: '[data-testid="user-menu"], button:has-text("Account")',
};

/**
 * Navigate to a page via sidebar
 */
export async function navigateTo(
  page: Page,
  destination: 'dashboard' | 'events' | 'clients' | 'resources' | 'analytics'
): Promise<void> {
  const paths: Record<string, string> = {
    dashboard: '/',
    events: '/events',
    clients: '/clients',
    resources: '/resources',
    analytics: '/analytics',
  };

  await page.goto(paths[destination]);
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Wait for any loading spinners to disappear
  const spinner = page.locator('[data-testid="loading"], .loading-spinner, [role="status"]');
  if (await spinner.isVisible({ timeout: 1000 }).catch(() => false)) {
    await spinner.waitFor({ state: 'hidden', timeout: 10000 });
  }
}

/**
 * Wait for and verify a toast notification
 */
export async function expectToast(
  page: Page,
  message: string | RegExp,
  _type: 'success' | 'error' | 'info' = 'success'
): Promise<void> {
  const toastSelector = '[role="alert"], [data-testid="toast"], .toast';
  const toast = page.locator(toastSelector);

  await expect(toast).toBeVisible({ timeout: 5000 });
  await expect(toast).toContainText(message);
  // Note: _type can be used for styling verification if needed
}

/**
 * Dismiss any visible toast notifications
 */
export async function dismissToast(page: Page): Promise<void> {
  const closeButton = page.locator(
    '[data-testid="toast-close"], .toast-close, [role="alert"] button'
  );
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click();
  }
}

/**
 * Fill a form field by label or name
 */
export async function fillField(page: Page, fieldName: string, value: string): Promise<void> {
  // Try multiple selectors
  const field = page
    .locator(`input[name="${fieldName}"]`)
    .or(page.locator(`textarea[name="${fieldName}"]`))
    .or(page.locator(`label:has-text("${fieldName}") + input`))
    .or(page.locator(`label:has-text("${fieldName}") + textarea`))
    .or(page.getByLabel(fieldName));

  await field.fill(value);
}

/**
 * Select an option from a dropdown
 */
export async function selectOption(page: Page, fieldName: string, value: string): Promise<void> {
  const select = page.locator(`select[name="${fieldName}"]`).or(page.getByLabel(fieldName));

  await select.selectOption(value);
}

/**
 * Click a button by text or test id
 */
export async function clickButton(page: Page, buttonText: string): Promise<void> {
  const button = page
    .locator(`button:has-text("${buttonText}")`)
    .or(page.locator(`[data-testid="${buttonText.toLowerCase().replace(/\s+/g, '-')}"]`))
    .or(page.getByRole('button', { name: buttonText }));

  await button.click();
}

/**
 * Get a table row by content
 */
export function getTableRow(page: Page, content: string): Locator {
  return page.locator(`tr:has-text("${content}")`);
}

/**
 * Click an action button in a table row
 */
export async function clickRowAction(
  page: Page,
  rowContent: string,
  actionName: string
): Promise<void> {
  const row = getTableRow(page, rowContent);
  const actionButton = row
    .locator(`button:has-text("${actionName}")`)
    .or(row.locator(`[data-testid="${actionName.toLowerCase()}"]`));

  await actionButton.click();
}

/**
 * Confirm a dialog/modal
 */
export async function confirmDialog(page: Page): Promise<void> {
  const confirmButton = page
    .locator('[role="dialog"] button:has-text("Confirm")')
    .or(page.locator('[role="dialog"] button:has-text("Yes")'))
    .or(page.locator('[role="dialog"] button:has-text("OK")'))
    .or(page.locator('[data-testid="confirm-button"]'));

  await confirmButton.click();
}

/**
 * Cancel a dialog/modal
 */
export async function cancelDialog(page: Page): Promise<void> {
  const cancelButton = page
    .locator('[role="dialog"] button:has-text("Cancel")')
    .or(page.locator('[role="dialog"] button:has-text("No")'))
    .or(page.locator('[data-testid="cancel-button"]'));

  await cancelButton.click();
}

/**
 * Wait for a modal to appear
 */
export async function waitForModal(page: Page): Promise<Locator> {
  const modal = page.locator('[role="dialog"], [data-testid="modal"]');
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  return modal;
}

/**
 * Close a modal if visible
 */
export async function closeModal(page: Page): Promise<void> {
  const closeButton = page
    .locator('[role="dialog"] button[aria-label="Close"]')
    .or(page.locator('[role="dialog"] button:has-text("Close")'))
    .or(page.locator('[data-testid="modal-close"]'));

  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click();
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 3000 });
  }
}

/**
 * Check if an element with specific text exists
 */
export async function hasText(page: Page, text: string): Promise<boolean> {
  const element = page.locator(`text="${text}"`);
  return element.isVisible({ timeout: 2000 }).catch(() => false);
}

/**
 * Wait for text to appear on the page
 */
export async function waitForText(page: Page, text: string): Promise<void> {
  await page.locator(`text="${text}"`).waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Get the count of items in a list or table
 */
export async function getItemCount(page: Page, selector = 'tbody tr'): Promise<number> {
  return page.locator(selector).count();
}

/**
 * Date picker helper - set a date
 */
export async function setDate(page: Page, fieldName: string, date: Date): Promise<void> {
  const dateInput = page.locator(`input[name="${fieldName}"]`).or(page.getByLabel(fieldName));

  // Format date as YYYY-MM-DD for input[type="date"]
  const formattedDate = date.toISOString().split('T')[0];
  await dateInput.fill(formattedDate);
}

/**
 * Status badge selectors
 */
export const statusBadges = {
  inquiry: '.status-inquiry, [data-status="inquiry"]',
  planning: '.status-planning, [data-status="planning"]',
  preparation: '.status-preparation, [data-status="preparation"]',
  in_progress: '.status-in-progress, [data-status="in_progress"]',
  completed: '.status-completed, [data-status="completed"]',
  follow_up: '.status-follow-up, [data-status="follow_up"]',
};

/**
 * Get status badge element
 */
export function getStatusBadge(page: Page, status: string): Locator {
  return page.locator(`[data-status="${status}"], :has-text("${status}")`).first();
}
