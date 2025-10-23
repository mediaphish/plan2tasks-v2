// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Inbox Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should display inbox items', async ({ page }) => {
    // Navigate to inbox
    await page.click('text=Inbox');
    await page.waitForLoadState('networkidle');
    
    // Check for inbox elements
    await expect(page.locator('text=Inbox')).toBeVisible();
    await expect(page.locator('text=Pending Items')).toBeVisible();
  });

  test('should create inbox item', async ({ page }) => {
    // Navigate to inbox
    await page.click('text=Inbox');
    await page.waitForLoadState('networkidle');
    
    // Click create item
    await page.click('button:has-text("Create Item")');
    
    // Fill item details
    await page.fill('input[placeholder*="title"]', 'New Inbox Item');
    await page.fill('textarea[placeholder*="description"]', 'This is a test inbox item');
    
    // Set priority
    await page.selectOption('select[name="priority"]', 'high');
    
    // Save item
    await page.click('button:has-text("Save Item")');
    
    // Verify item was created
    await expect(page.locator('text=New Inbox Item')).toBeVisible();
  });

  test('should assign inbox item', async ({ page }) => {
    // Navigate to inbox
    await page.click('text=Inbox');
    await page.waitForLoadState('networkidle');
    
    // Select an item
    const itemCheckbox = page.locator('input[type="checkbox"][data-testid="inbox-item"]').first();
    if (await itemCheckbox.isVisible()) {
      await itemCheckbox.click();
      
      // Click assign
      await page.click('button:has-text("Assign")');
      
      // Select assignee
      await page.selectOption('select[name="assignee"]', 'testuser@example.com');
      
      // Confirm assignment
      await page.click('button:has-text("Assign Item")');
      
      // Verify assignment
      await expect(page.locator('text=Item assigned successfully')).toBeVisible();
    }
  });

  test('should archive inbox item', async ({ page }) => {
    // Navigate to inbox
    await page.click('text=Inbox');
    await page.waitForLoadState('networkidle');
    
    // Select an item
    const itemCheckbox = page.locator('input[type="checkbox"][data-testid="inbox-item"]').first();
    if (await itemCheckbox.isVisible()) {
      await itemCheckbox.click();
      
      // Click archive
      await page.click('button:has-text("Archive")');
      
      // Confirm archive
      await page.click('button:has-text("Confirm Archive")');
      
      // Verify item was archived
      await expect(page.locator('text=Item archived successfully')).toBeVisible();
    }
  });

  test('should restore archived item', async ({ page }) => {
    // Navigate to inbox
    await page.click('text=Inbox');
    await page.waitForLoadState('networkidle');
    
    // Switch to archived view
    await page.click('button:has-text("Archived")');
    
    // Select archived item
    const itemCheckbox = page.locator('input[type="checkbox"][data-testid="archived-item"]').first();
    if (await itemCheckbox.isVisible()) {
      await itemCheckbox.click();
      
      // Click restore
      await page.click('button:has-text("Restore")');
      
      // Verify item was restored
      await expect(page.locator('text=Item restored successfully')).toBeVisible();
    }
  });

  test('should search inbox items', async ({ page }) => {
    // Navigate to inbox
    await page.click('text=Inbox');
    await page.waitForLoadState('networkidle');
    
    // Enter search term
    await page.fill('input[placeholder*="search"]', 'test item');
    
    // Press enter or click search
    await page.press('input[placeholder*="search"]', 'Enter');
    
    // Verify search results
    const searchResults = page.locator('[data-testid="inbox-item"]');
    if (await searchResults.count() > 0) {
      await expect(searchResults.first()).toBeVisible();
    }
  });

  test('should filter inbox items', async ({ page }) => {
    // Navigate to inbox
    await page.click('text=Inbox');
    await page.waitForLoadState('networkidle');
    
    // Filter by priority
    await page.selectOption('select[name="priority_filter"]', 'high');
    
    // Verify filtered results
    const highPriorityItems = page.locator('[data-testid="inbox-item"][data-priority="high"]');
    if (await highPriorityItems.count() > 0) {
      await expect(highPriorityItems.first()).toBeVisible();
    }
  });

  test('should delete inbox item', async ({ page }) => {
    // Navigate to inbox
    await page.click('text=Inbox');
    await page.waitForLoadState('networkidle');
    
    // Select an item
    const itemCheckbox = page.locator('input[type="checkbox"][data-testid="inbox-item"]').first();
    if (await itemCheckbox.isVisible()) {
      await itemCheckbox.click();
      
      // Click delete
      await page.click('button:has-text("Delete")');
      
      // Confirm deletion
      await page.click('button:has-text("Confirm Delete")');
      
      // Verify item was deleted
      await expect(page.locator('text=Item deleted successfully')).toBeVisible();
    }
  });
});
