/**
 * Playwright Global Setup
 *
 * Runs once before all E2E tests to set up the test environment.
 */

import { chromium, type FullConfig } from '@playwright/test';
import { cleanTestDatabase, seedTestData } from './helpers/db';
import { setupAuthState, ADMIN_AUTH_FILE } from './helpers/auth';
import fs from 'node:fs';
import path from 'node:path';

async function globalSetup(_config: FullConfig): Promise<void> {
  console.log('🧪 Starting E2E test setup...');

  // Ensure auth directory exists
  const authDir = path.dirname(ADMIN_AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Clean and seed database
  console.log('📦 Cleaning test database...');
  await cleanTestDatabase();

  console.log('🌱 Seeding test data...');
  await seedTestData();

  // Setup authenticated browser states
  console.log('🔐 Setting up authentication states...');
  const browser = await chromium.launch();
  const context = await browser.newContext();

  try {
    await setupAuthState(context);
    console.log('✅ Auth states saved to:', authDir);
  } catch (error) {
    console.error('❌ Failed to setup auth states:', error);
    // Continue without pre-authenticated states - tests will login manually
  }

  await context.close();
  await browser.close();

  console.log('✅ E2E test setup complete');
}

export default globalSetup;
