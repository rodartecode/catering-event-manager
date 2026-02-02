/**
 * Performance measurement helpers for Core Web Vitals.
 *
 * Provides functions to measure LCP (Largest Contentful Paint) and
 * CLS (Cumulative Layout Shift) using the Performance API.
 */

import type { Page } from '@playwright/test';

/**
 * Measure Largest Contentful Paint (LCP) in milliseconds.
 *
 * LCP measures loading performance - the time it takes for the largest
 * content element to become visible in the viewport.
 *
 * @param page - Playwright page instance
 * @returns LCP value in milliseconds
 */
export async function measureLCP(page: Page): Promise<number> {
  const lcp = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let lcpValue = 0;

      // Create a PerformanceObserver to track LCP entries
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        // LCP is the last entry reported
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          lcpValue = lastEntry.startTime;
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      // Wait for page to settle, then return the LCP value
      // Use requestIdleCallback if available, otherwise setTimeout
      const waitAndResolve = () => {
        observer.disconnect();
        resolve(lcpValue);
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(waitAndResolve, { timeout: 2000 });
      } else {
        setTimeout(waitAndResolve, 1000);
      }
    });
  });

  return lcp;
}

/**
 * Measure Cumulative Layout Shift (CLS) score.
 *
 * CLS measures visual stability - how much the page content shifts
 * unexpectedly during loading.
 *
 * @param page - Playwright page instance
 * @returns CLS score (lower is better, target < 0.1 is good, < 0.25 needs improvement)
 */
export async function measureCLS(page: Page): Promise<number> {
  const cls = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let clsValue = 0;

      // Create a PerformanceObserver to track layout shifts
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          // Only count layout shifts without recent user input
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });

      // Wait for page to settle, then return the CLS value
      const waitAndResolve = () => {
        observer.disconnect();
        resolve(clsValue);
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(waitAndResolve, { timeout: 2000 });
      } else {
        setTimeout(waitAndResolve, 1000);
      }
    });
  });

  return cls;
}

/**
 * Measure both LCP and CLS in a single call.
 *
 * @param page - Playwright page instance
 * @returns Object with lcp (ms) and cls (score) values
 */
export async function measureCoreWebVitals(page: Page): Promise<{ lcp: number; cls: number }> {
  const [lcp, cls] = await Promise.all([measureLCP(page), measureCLS(page)]);
  return { lcp, cls };
}

/**
 * Performance thresholds based on Google's Web Vitals recommendations.
 * @see https://web.dev/vitals/
 */
export const PERFORMANCE_THRESHOLDS = {
  /** LCP should be under 2.5s for "good", under 4s for "needs improvement" */
  LCP_GOOD: 2500,
  LCP_NEEDS_IMPROVEMENT: 4000,

  /** CLS should be under 0.1 for "good", under 0.25 for "needs improvement" */
  CLS_GOOD: 0.1,
  CLS_NEEDS_IMPROVEMENT: 0.25,
} as const;
