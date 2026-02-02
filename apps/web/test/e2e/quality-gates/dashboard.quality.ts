/**
 * Quality Gate Tests: Dashboard Page
 *
 * Tests visual regression, accessibility (WCAG 2.1 AA), and performance
 * (Core Web Vitals) for the main dashboard page (authenticated).
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { measureCLS, measureLCP } from '../helpers/performance';

test.describe('Dashboard Quality Gates', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('visual appearance', async ({ page }) => {
    // Wait for any animations or chart renders to complete
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('dashboard.png', {
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
    // Note: Auth state is preserved from beforeEach
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const lcp = await measureLCP(page);
    const cls = await measureCLS(page);

    console.log(`Performance metrics - LCP: ${lcp}ms, CLS: ${cls}`);

    expect(lcp, `LCP ${lcp}ms exceeds 3000ms threshold`).toBeLessThan(3000);
    expect(cls, `CLS ${cls} exceeds 0.15 threshold`).toBeLessThan(0.15);
  });
});
