// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Google Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should connect to Google Tasks', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Look for Google connection
    const connectButton = page.locator('button:has-text("Connect Google")');
    if (await connectButton.isVisible()) {
      await connectButton.click();
      
      // Should redirect to Google OAuth
      await page.waitForURL(/accounts.google.com/);
      
      // Complete OAuth flow (simplified)
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button:has-text("Next")');
      
      // Should redirect back to app
      await page.waitForURL(/plan2tasks.com/);
      
      // Verify connection
      await expect(page.locator('text=Google Tasks Connected')).toBeVisible();
    }
  });

  test('should sync tasks to Google Tasks', async ({ page }) => {
    // Navigate to plan
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Create a plan with tasks
    await page.click('button:has-text("Create Plan")');
    await page.fill('input[placeholder*="plan name"]', 'Google Sync Test');
    
    // Add task
    await page.click('button:has-text("Add Task")');
    await page.fill('input[placeholder*="task"]', 'Sync this task to Google');
    await page.fill('input[placeholder*="assignee"]', 'testuser@example.com');
    
    // Enable Google sync
    await page.check('input[type="checkbox"][name="google_sync"]');
    
    // Save and assign
    await page.click('button:has-text("Save Plan")');
    await page.click('button:has-text("Assign Tasks")');
    
    // Verify sync
    await expect(page.locator('text=Tasks synced to Google')).toBeVisible();
  });

  test('should generate ICS file', async ({ page }) => {
    // Navigate to plan
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Select a plan
    const planItem = page.locator('[data-testid="plan-item"]').first();
    if (await planItem.isVisible()) {
      await planItem.click();
      
      // Click generate ICS
      await page.click('button:has-text("Generate ICS")');
      
      // Should download ICS file
      const download = await page.waitForEvent('download');
      expect(download.suggestedFilename()).toContain('.ics');
    }
  });

  test('should handle Google API errors', async ({ page }) => {
    // Navigate to plan
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Try to sync when Google is not connected
    const planItem = page.locator('[data-testid="plan-item"]').first();
    if (await planItem.isVisible()) {
      await planItem.click();
      
      // Try to sync without connection
      await page.click('button:has-text("Sync to Google")');
      
      // Check for error
      await expect(page.locator('text=Google Tasks not connected')).toBeVisible();
    }
  });

  test('should refresh Google connection', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh Connection")');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      
      // Verify refresh
      await expect(page.locator('text=Connection refreshed')).toBeVisible();
    }
  });
});
