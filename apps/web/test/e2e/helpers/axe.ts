import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Run axe accessibility scan on the current page.
 *
 * Default configuration:
 * - Targets WCAG 2.1 AA compliance
 * - Excludes color-contrast rule (handled separately)
 *
 * Usage:
 * ```ts
 * import { checkA11y } from './helpers/axe';
 *
 * test('login page is accessible', async ({ page }) => {
 *   await page.goto('/login');
 *   await checkA11y(page);
 * });
 * ```
 */
export async function checkA11y(page: Page, options?: { exclude?: string[] }) {
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules([
      // Color contrast is checked manually and in design reviews
      'color-contrast',
      ...(options?.exclude ?? []),
    ]);

  const accessibilityScanResults = await builder.analyze();

  // Format violations for readable error messages
  const violations = accessibilityScanResults.violations;

  if (violations.length > 0) {
    const violationMessages = violations.map((violation) => {
      const nodes = violation.nodes
        .map((node) => `  - ${node.target.join(', ')}: ${node.failureSummary}`)
        .join('\n');
      return `${violation.id}: ${violation.description}\n${nodes}`;
    });

    expect(violations, `Accessibility violations found:\n${violationMessages.join('\n\n')}`).toHaveLength(0);
  }
}

/**
 * Run axe scan and return results without failing (for reporting).
 */
export async function scanA11y(page: Page) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);

  return builder.analyze();
}

/**
 * Check a specific element for accessibility violations.
 */
export async function checkElementA11y(page: Page, selector: string) {
  const builder = new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(['color-contrast']);

  const results = await builder.analyze();

  expect(results.violations).toHaveLength(0);
}
