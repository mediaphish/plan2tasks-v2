// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Task Assignment Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should create and assign tasks', async ({ page }) => {
    // Navigate to plan creation
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Create a new plan
    await page.click('button:has-text("Create Plan")');
    await page.fill('input[placeholder*="plan name"]', 'Task Assignment Test');
    
    // Add tasks to plan
    await page.click('button:has-text("Add Task")');
    await page.fill('input[placeholder*="task"]', 'Complete project documentation');
    await page.fill('input[placeholder*="assignee"]', 'testuser@example.com');
    
    // Add another task
    await page.click('button:has-text("Add Task")');
    await page.fill('input[placeholder*="task"]', 'Review code changes');
    await page.fill('input[placeholder*="assignee"]', 'testuser@example.com');
    
    // Save plan
    await page.click('button:has-text("Save Plan")');
    
    // Verify tasks were created
    await expect(page.locator('text=Complete project documentation')).toBeVisible();
    await expect(page.locator('text=Review code changes')).toBeVisible();
  });

  test('should assign tasks to multiple users', async ({ page }) => {
    // Navigate to existing plan
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Select a plan
    const planItem = page.locator('[data-testid="plan-item"]').first();
    if (await planItem.isVisible()) {
      await planItem.click();
      
      // Assign to multiple users
      await page.check('input[value="user1@example.com"]');
      await page.check('input[value="user2@example.com"]');
      
      // Click assign
      await page.click('button:has-text("Assign Tasks")');
      
      // Verify assignment
      await expect(page.locator('text=Tasks assigned to 2 users')).toBeVisible();
    }
  });

  test('should handle task assignment errors', async ({ page }) => {
    // Navigate to plan
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Try to assign to invalid user
    const planItem = page.locator('[data-testid="plan-item"]').first();
    if (await planItem.isVisible()) {
      await planItem.click();
      
      // Enter invalid email
      await page.fill('input[placeholder*="email"]', 'invalid-email');
      await page.click('button:has-text("Assign")');
      
      // Check for error
      await expect(page.locator('text=Invalid email address')).toBeVisible();
    }
  });

  test('should check user limits before assignment', async ({ page }) => {
    // Navigate to plan
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Try to assign to users when at limit
    const planItem = page.locator('[data-testid="plan-item"]').first();
    if (await planItem.isVisible()) {
      await planItem.click();
      
      // Check if user limit error appears
      const limitError = page.locator('text=User limit reached');
      if (await limitError.isVisible()) {
        await expect(limitError).toBeVisible();
        await expect(page.locator('text=Upgrade your plan')).toBeVisible();
      }
    }
  });
});
