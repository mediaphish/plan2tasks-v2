// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Template System Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new template', async ({ page }) => {
    // Navigate to templates
    await page.click('text=Templates');
    await page.waitForLoadState('networkidle');
    
    // Click create template
    await page.click('button:has-text("Create Template")');
    
    // Fill template details
    await page.fill('input[placeholder*="template name"]', 'Project Kickoff Template');
    await page.fill('textarea[placeholder*="description"]', 'Standard project kickoff checklist');
    
    // Add template tasks
    await page.click('button:has-text("Add Task")');
    await page.fill('input[placeholder*="task"]', 'Set up project repository');
    await page.fill('input[placeholder*="assignee"]', 'developer@example.com');
    
    // Add another task
    await page.click('button:has-text("Add Task")');
    await page.fill('input[placeholder*="task"]', 'Create project documentation');
    await page.fill('input[placeholder*="assignee"]', 'writer@example.com');
    
    // Save template
    await page.click('button:has-text("Save Template")');
    
    // Verify template was created
    await expect(page.locator('text=Project Kickoff Template')).toBeVisible();
  });

  test('should use existing template', async ({ page }) => {
    // Navigate to templates
    await page.click('text=Templates');
    await page.waitForLoadState('networkidle');
    
    // Select a template
    const templateItem = page.locator('[data-testid="template-item"]').first();
    if (await templateItem.isVisible()) {
      await templateItem.click();
      
      // Click use template
      await page.click('button:has-text("Use Template")');
      
      // Customize plan name
      await page.fill('input[placeholder*="plan name"]', 'Custom Project Plan');
      
      // Create plan from template
      await page.click('button:has-text("Create Plan")');
      
      // Verify plan was created
      await expect(page.locator('text=Custom Project Plan')).toBeVisible();
    }
  });

  test('should edit template', async ({ page }) => {
    // Navigate to templates
    await page.click('text=Templates');
    await page.waitForLoadState('networkidle');
    
    // Find and click edit on first template
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Modify template
      await page.fill('input[value*="Template"]', 'Updated Template Name');
      
      // Add new task
      await page.click('button:has-text("Add Task")');
      await page.fill('input[placeholder*="task"]', 'New template task');
      
      // Save changes
      await page.click('button:has-text("Save Template")');
      
      // Verify changes
      await expect(page.locator('text=Updated Template Name')).toBeVisible();
    }
  });

  test('should delete template', async ({ page }) => {
    // Navigate to templates
    await page.click('text=Templates');
    await page.waitForLoadState('networkidle');
    
    // Find and click delete on first template
    const deleteButton = page.locator('button:has-text("Delete")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion
      await page.click('button:has-text("Confirm Delete")');
      
      // Verify template was deleted
      await expect(page.locator('text=Template deleted successfully')).toBeVisible();
    }
  });

  test('should suggest templates', async ({ page }) => {
    // Navigate to plan creation
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Click create plan
    await page.click('button:has-text("Create Plan")');
    
    // Enter plan description
    await page.fill('textarea[placeholder*="describe"]', 'I need to plan a software development project');
    
    // Click suggest templates
    await page.click('button:has-text("Suggest Templates")');
    
    // Wait for suggestions
    await page.waitForSelector('text=Template suggestions', { timeout: 10000 });
    
    // Verify suggestions
    await expect(page.locator('text=Software Development Template')).toBeVisible();
  });

  test('should share template', async ({ page }) => {
    // Navigate to templates
    await page.click('text=Templates');
    await page.waitForLoadState('networkidle');
    
    // Select a template
    const templateItem = page.locator('[data-testid="template-item"]').first();
    if (await templateItem.isVisible()) {
      await templateItem.click();
      
      // Click share
      await page.click('button:has-text("Share Template")');
      
      // Verify share options
      await expect(page.locator('text=Share Template')).toBeVisible();
      await expect(page.locator('text=Copy Link')).toBeVisible();
    }
  });
});
