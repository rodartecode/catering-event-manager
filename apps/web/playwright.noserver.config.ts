import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing - no webServer auto-start.
 * Use when services are already running externally.
 */
export default defineConfig({
  testDir: './test/e2e/workflows',
  testMatch: '**/*.e2e.ts',
  globalSetup: './test/e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 90 * 1000,
  expect: {
    timeout: 5000,
  },
  outputDir: 'test-results/',
});
