/**
 * Task Management E2E Tests
 *
 * Tests task creation, assignment, status transitions, and overdue detection.
 */

import { expect, test } from '@playwright/test';
import { loginAsAdmin, TEST_ADMIN } from '../helpers/auth';
import {
  cleanTestDatabase,
  seedTestClient,
  seedTestEvent,
  seedTestTask,
  seedTestUser,
} from '../helpers/db';

test.describe('Task Management', () => {
  let testEventId: number;

  test.beforeAll(async () => {
    await cleanTestDatabase();
    // Seed required data
    const admin = await seedTestUser(TEST_ADMIN.email, 'administrator', TEST_ADMIN.password);
    const client = await seedTestClient();
    const event = await seedTestEvent({
      clientId: client.id,
      createdBy: admin.id,
      eventName: 'Task Test Event',
      status: 'planning',
    });
    testEventId = event.id;

    // Seed an overdue task for the overdue indicator test
    await seedTestTask({
      eventId: event.id,
      title: 'Overdue Test Task',
      category: 'pre_event',
      status: 'pending',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    });
  });

  test.describe
    .serial('Task CRUD Operations', () => {
      let taskName: string;

      test('create task for event', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto(`/events/${testEventId}`);

        // Wait for page to load
        await expect(page.locator('h1').first()).toBeVisible();

        // Click Add Task button
        await page.locator('button:has-text("Add Task")').click();

        // Wait for TaskForm dialog
        await expect(page.locator('h3:has-text("Create Task")')).toBeVisible();

        // Fill task details
        taskName = `E2E Test Task ${Date.now()}`;
        await page.fill('#title', taskName);
        await page.fill('#description', 'Test task description');
        await page.selectOption('#category', 'pre_event');

        // Set due date (3 days from now) — datetime-local format: YYYY-MM-DDThh:mm
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        await page.fill('#dueDate', dueDate.toISOString().slice(0, 16));

        // Submit
        await page.locator('button[type="submit"]:has-text("Create Task")').click();

        // Wait for dialog to close and task to appear in list
        await expect(page.locator('h3:has-text("Create Task")')).not.toBeVisible({
          timeout: 10000,
        });
        await expect(page.locator(`text="${taskName}"`)).toBeVisible({ timeout: 10000 });
      });

      test('view task in event detail', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto(`/events/${testEventId}`);

        // Wait for tasks to load
        await expect(page.locator('h2:has-text("Tasks")')).toBeVisible();

        // Should see the task we created
        const taskCard = page.locator(`[data-testid="task-card"]:has-text("${taskName}")`);
        await expect(taskCard).toBeVisible();

        // Should show pending status
        await expect(taskCard.locator('text=Pending')).toBeVisible();
      });

      test('update task status: pending → in_progress', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto(`/events/${testEventId}`);

        // Find the task card
        const taskCard = page.locator(`[data-testid="task-card"]:has-text("${taskName}")`);
        await taskCard.waitFor({ state: 'visible' });

        // Click "Start" button (TaskStatusButton for pending tasks)
        await taskCard.locator('button:has-text("Start")').click();

        // Wait for status to update — "In Progress" badge should appear
        await expect(taskCard.locator('text=In Progress')).toBeVisible({ timeout: 10000 });
      });

      test('update task status: in_progress → completed', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto(`/events/${testEventId}`);

        // Find the task card
        const taskCard = page.locator(`[data-testid="task-card"]:has-text("${taskName}")`);
        await taskCard.waitFor({ state: 'visible' });

        // Click "Complete" button (TaskStatusButton for in_progress tasks)
        await taskCard.locator('button:has-text("Complete")').click();

        // Wait for status to update — "Completed" badge should appear
        await expect(taskCard.locator('text=Completed')).toBeVisible({ timeout: 10000 });
      });
    });

  test.describe('Task Assignment', () => {
    test('assign task to user', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`/events/${testEventId}`);

      // Wait for page to load
      await expect(page.locator('h2:has-text("Tasks")')).toBeVisible();

      // Create a new task for assignment testing
      await page.locator('button:has-text("Add Task")').click();
      await expect(page.locator('h3:has-text("Create Task")')).toBeVisible();

      const assignmentTaskName = `Assignment Test ${Date.now()}`;
      await page.fill('#title', assignmentTaskName);
      await page.locator('button[type="submit"]:has-text("Create Task")').click();

      // Wait for task to appear
      await expect(page.locator('h3:has-text("Create Task")')).not.toBeVisible({ timeout: 10000 });
      await expect(page.locator(`text="${assignmentTaskName}"`)).toBeVisible({ timeout: 10000 });

      // Click "Assign" button on the task card
      const taskCard = page.locator(`[data-testid="task-card"]:has-text("${assignmentTaskName}")`);
      await taskCard.locator('button:has-text("Assign")').click();

      // Wait for TaskAssignDialog
      await expect(page.locator('h3:has-text("Assign Task")')).toBeVisible();

      // Select the admin user (first non-"Unassigned" button)
      const userButton = page
        .locator('.fixed.inset-0')
        .last()
        .locator('button:has-text("Test Admin")');
      await userButton.click();

      // Confirm assignment
      await page
        .locator('.fixed.inset-0')
        .last()
        .locator('button:has-text("Assign")')
        .last()
        .click();

      // Dialog should close
      await expect(page.locator('h3:has-text("Assign Task")')).not.toBeVisible({ timeout: 10000 });

      // Verify assignee shows on task card
      await expect(taskCard.locator('text=Test Admin')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Overdue Tasks', () => {
    test('overdue task is visually marked', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`/events/${testEventId}`);

      // Wait for tasks to load
      await expect(page.locator('h2:has-text("Tasks")')).toBeVisible();

      // Find the seeded overdue task
      const overdueTaskCard = page.locator(
        '[data-testid="task-card"]:has-text("Overdue Test Task")'
      );
      await expect(overdueTaskCard).toBeVisible();

      // Should have an overdue indicator
      await expect(overdueTaskCard.locator('[data-testid="overdue-indicator"]')).toBeVisible();
    });
  });
});
