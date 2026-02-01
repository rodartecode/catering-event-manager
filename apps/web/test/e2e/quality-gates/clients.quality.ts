/**
 * Quality Gate Tests: Clients Page
 *
 * Tests visual regression, accessibility (WCAG 2.1 AA), and performance
 * (Core Web Vitals) for the clients list page (authenticated).
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { measureLCP, measureCLS } from '../helpers/performance';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Clients Page Quality Gates', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
  });

  test('visual appearance', async ({ page }) => {
    // Wait for table/list data to load and any animations to complete
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('clients.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });

  test('accessibility (WCAG 2.1 AA)', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Filter for critical and serious violations only
    const serious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (serious.length > 0) {
      const messages = serious.map((v) => {
        const nodes = v.nodes
          .map((n) => `  - ${n.target.join(', ')}: ${n.failureSummary}`)
          .join('\n');
        return `${v.id} (${v.impact}): ${v.description}\n${nodes}`;
      });
      console.log('Accessibility violations found:\n', messages.join('\n\n'));
    }

    expect(
      serious,
      `Found ${serious.length} critical/serious accessibility violations`
    ).toHaveLength(0);
  });

  test('performance (LCP < 3s, CLS < 0.15)', async ({ page }) => {
    // Navigate fresh to measure performance from page load
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const lcp = await measureLCP(page);
    const cls = await measureCLS(page);

    console.log(`Performance metrics - LCP: ${lcp}ms, CLS: ${cls}`);

    expect(lcp, `LCP ${lcp}ms exceeds 3000ms threshold`).toBeLessThan(3000);
    expect(cls, `CLS ${cls} exceeds 0.15 threshold`).toBeLessThan(0.15);
  });
});
