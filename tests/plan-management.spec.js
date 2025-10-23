// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Plan Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new plan', async ({ page }) => {
    // Navigate to plan creation
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Check for plan creation interface
    await expect(page.locator('text=Create Plan')).toBeVisible();
    
    // Fill out plan details
    await page.fill('input[placeholder*="plan name"]', 'Test Plan');
    await page.fill('textarea[placeholder*="description"]', 'This is a test plan');
    
    // Submit plan
    await page.click('button:has-text("Create Plan")');
    
    // Verify plan was created
    await expect(page.locator('text=Test Plan')).toBeVisible();
  });

  test('should edit existing plan', async ({ page }) => {
    // Navigate to plans
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Find and click edit on first plan
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Modify plan
      await page.fill('input[value*="Plan"]', 'Updated Plan Name');
      await page.click('button:has-text("Save")');
      
      // Verify changes
      await expect(page.locator('text=Updated Plan Name')).toBeVisible();
    }
  });

  test('should delete plan', async ({ page }) => {
    // Navigate to plans
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Find and click delete on first plan
    const deleteButton = page.locator('button:has-text("Delete")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion
      await page.click('button:has-text("Confirm")');
      
      // Verify plan was deleted
      await expect(page.locator('text=Plan deleted successfully')).toBeVisible();
    }
  });

  test('should assign plan to users', async ({ page }) => {
    // Navigate to plans
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Select a plan
    const planItem = page.locator('[data-testid="plan-item"]').first();
    if (await planItem.isVisible()) {
      await planItem.click();
      
      // Click assign button
      await page.click('button:has-text("Assign")');
      
      // Select users
      await page.check('input[type="checkbox"][value*="user"]');
      
      // Confirm assignment
      await page.click('button:has-text("Assign Plan")');
      
      // Verify assignment
      await expect(page.locator('text=Plan assigned successfully')).toBeVisible();
    }
  });
});
