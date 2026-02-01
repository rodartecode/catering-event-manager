import { axe, configureAxe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import { expect } from 'vitest';
import type { AxeResults } from 'axe-core';

// Extend Vitest's expect with axe matchers
expect.extend(matchers);

/**
 * Configure axe-core for our application's testing needs.
 *
 * Default configuration:
 * - Targets WCAG 2.1 AA compliance
 * - Ignores color-contrast in JSDOM (unreliable without real rendering)
 *
 * Usage:
 * ```tsx
 * import { axe } from '@/test/helpers/axe';
 *
 * it('has no accessibility violations', async () => {
 *   const { container } = render(<MyComponent />);
 *   const results = await axe(container);
 *   expect(results).toHaveNoViolations();
 * });
 * ```
 */
const configuredAxe = configureAxe({
  rules: {
    // Color contrast checks are unreliable in JSDOM since it doesn't compute
    // actual rendered styles. We verify contrast manually and in E2E tests.
    'color-contrast': { enabled: false },
    // Region rule can be noisy for isolated component tests
    region: { enabled: false },
  },
});

export { configuredAxe as axe };

/**
 * Run axe with custom rule overrides for specific test cases.
 *
 * @param container - The DOM element to test
 * @param disabledRules - Array of rule IDs to disable for this test
 * @returns Promise resolving to axe results
 *
 * Usage:
 * ```tsx
 * const results = await axeWithOverrides(container, ['landmark-one-main']);
 * expect(results).toHaveNoViolations();
 * ```
 */
export async function axeWithOverrides(
  container: Element,
  disabledRules: string[] = []
): Promise<AxeResults> {
  const customAxe = configureAxe({
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      ...Object.fromEntries(disabledRules.map((rule) => [rule, { enabled: false }])),
    },
  });
  return customAxe(container);
}

/**
 * Format axe violations for readable test output.
 *
 * @param results - The axe results object
 * @returns Formatted string describing violations
 */
export function formatViolations(results: AxeResults): string {
  if (results.violations.length === 0) {
    return 'No accessibility violations found.';
  }

  return results.violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `  - ${node.html}\n    Fix: ${node.failureSummary}`)
        .join('\n');
      return `${violation.id}: ${violation.description}\n${nodes}`;
    })
    .join('\n\n');
}

// Re-export the base axe for cases where custom config isn't needed
export { axe as baseAxe } from 'vitest-axe';

// Type augmentation for Vitest's expect
declare module 'vitest' {
  interface Assertion<T> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
