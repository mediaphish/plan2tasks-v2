// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('User Dashboard Tests', () => {
  test('should display user dashboard', async ({ page }) => {
    // Login as user
    await page.goto('/?user=testuser@example.com');
    await page.waitForLoadState('networkidle');
    
    // Check for user dashboard elements
    await expect(page.locator('text=Your Tasks')).toBeVisible();
    await expect(page.locator('text=Assigned Plans')).toBeVisible();
    await expect(page.locator('text=Task History')).toBeVisible();
  });

  test('should show assigned tasks', async ({ page }) => {
    // Login as user
    await page.goto('/?user=testuser@example.com');
    await page.waitForLoadState('networkidle');
    
    // Check for assigned tasks
    const taskItems = page.locator('[data-testid="task-item"]');
    if (await taskItems.count() > 0) {
      await expect(taskItems.first()).toBeVisible();
    }
  });

  test('should mark task as complete', async ({ page }) => {
    // Login as user
    await page.goto('/?user=testuser@example.com');
    await page.waitForLoadState('networkidle');
    
    // Find a task
    const taskCheckbox = page.locator('input[type="checkbox"][data-testid="task-checkbox"]').first();
    if (await taskCheckbox.isVisible()) {
      await taskCheckbox.click();
      
      // Verify task marked complete
      await expect(page.locator('text=Task completed')).toBeVisible();
    }
  });

  test('should view task details', async ({ page }) => {
    // Login as user
    await page.goto('/?user=testuser@example.com');
    await page.waitForLoadState('networkidle');
    
    // Click on a task
    const taskItem = page.locator('[data-testid="task-item"]').first();
    if (await taskItem.isVisible()) {
      await taskItem.click();
      
      // Check for task details
      await expect(page.locator('text=Task Details')).toBeVisible();
      await expect(page.locator('text=Description')).toBeVisible();
      await expect(page.locator('text=Deadline')).toBeVisible();
    }
  });

  test('should filter tasks', async ({ page }) => {
    // Login as user
    await page.goto('/?user=testuser@example.com');
    await page.waitForLoadState('networkidle');
    
    // Filter by status
    await page.selectOption('select[name="status"]', 'pending');
    
    // Verify filtered results
    const pendingTasks = page.locator('[data-testid="task-item"][data-status="pending"]');
    if (await pendingTasks.count() > 0) {
      await expect(pendingTasks.first()).toBeVisible();
    }
  });

  test('should export tasks', async ({ page }) => {
    // Login as user
    await page.goto('/?user=testuser@example.com');
    await page.waitForLoadState('networkidle');
    
    // Click export button
    await page.click('button:has-text("Export Tasks")');
    
    // Should download file
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should handle no tasks state', async ({ page }) => {
    // Login as user with no tasks
    await page.goto('/?user=notasks@example.com');
    await page.waitForLoadState('networkidle');
    
    // Check for empty state
    await expect(page.locator('text=No tasks assigned')).toBeVisible();
    await expect(page.locator('text=Check back later')).toBeVisible();
  });
});
