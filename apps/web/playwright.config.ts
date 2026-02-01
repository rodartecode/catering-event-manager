import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing.
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory and file matching
  testDir: './test/e2e/workflows',
  testMatch: '**/*.e2e.ts',

  // Global setup - runs once before all tests
  globalSetup: './test/e2e/global-setup.ts',

  // Run test files serially - each file's beforeAll does cleanTestDatabase()
  // which would corrupt parallel runs sharing the same PostgreSQL database
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Single worker - shared database requires serial execution
  workers: 1,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Quality gates project for visual regression, accessibility, and performance tests
    {
      name: 'quality-gates',
      testDir: './test/e2e/quality-gates',
      testMatch: '**/*.quality.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment for additional browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local servers before starting the tests
  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes for dev server to start
    },
    {
      command: 'cd ../scheduling-service && go run cmd/scheduler/main.go',
      url: 'http://localhost:8383/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000, // 1 minute for Go service to start
    },
  ],

  // Test timeout
  timeout: 30 * 1000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Output folder for test artifacts
  outputDir: 'test-results/',
});
