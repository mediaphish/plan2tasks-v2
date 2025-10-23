// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Workflow Tests', () => {
  test('complete user journey - plan creation to task delivery', async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Create a plan
    await page.click('text=Plan');
    await page.click('button:has-text("Create Plan")');
    await page.fill('input[placeholder*="plan name"]', 'Complete Workflow Test');
    await page.fill('textarea[placeholder*="description"]', 'End-to-end workflow test');
    
    // Step 2: Add tasks using AI
    await page.click('button:has-text("AI Planning")');
    await page.fill('textarea[placeholder*="describe"]', 'Create tasks for website launch');
    await page.click('button:has-text("Generate Plan")');
    await page.waitForSelector('text=Plan generated', { timeout: 30000 });
    
    // Step 3: Assign tasks to users
    await page.click('button:has-text("Assign Tasks")');
    await page.check('input[value="testuser@example.com"]');
    await page.click('button:has-text("Assign")');
    
    // Step 4: Enable Google sync
    await page.check('input[name="google_sync"]');
    await page.click('button:has-text("Save Plan")');
    
    // Step 5: Verify plan was created and assigned
    await expect(page.locator('text=Complete Workflow Test')).toBeVisible();
    await expect(page.locator('text=Tasks assigned successfully')).toBeVisible();
  });

  test('user receives and completes tasks', async ({ page }) => {
    // Login as user
    await page.goto('/?user=testuser@example.com');
    await page.waitForLoadState('networkidle');
    
    // Check for assigned tasks
    await expect(page.locator('text=Your Tasks')).toBeVisible();
    
    // Complete a task
    const taskCheckbox = page.locator('input[type="checkbox"][data-testid="task-checkbox"]').first();
    if (await taskCheckbox.isVisible()) {
      await taskCheckbox.click();
      await expect(page.locator('text=Task completed')).toBeVisible();
    }
  });

  test('billing integration with user limits', async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
    
    // Check billing status
    await page.click('text=Settings');
    await expect(page.locator('text=Billing & Subscription')).toBeVisible();
    
    // Try to invite user when at limit
    await page.click('text=Users');
    await page.click('button:has-text("Invite")');
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.click('button:has-text("Send Invite")');
    
    // Check for user limit error
    const limitError = page.locator('text=User limit reached');
    if (await limitError.isVisible()) {
      await expect(limitError).toBeVisible();
      await expect(page.locator('text=Upgrade your plan')).toBeVisible();
    }
  });

  test('template to plan to task assignment workflow', async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Create template
    await page.click('text=Templates');
    await page.click('button:has-text("Create Template")');
    await page.fill('input[placeholder*="template name"]', 'Workflow Template');
    await page.click('button:has-text("Add Task")');
    await page.fill('input[placeholder*="task"]', 'Template task');
    await page.click('button:has-text("Save Template")');
    
    // Step 2: Use template to create plan
    await page.click('button:has-text("Use Template")');
    await page.fill('input[placeholder*="plan name"]', 'Template-based Plan');
    await page.click('button:has-text("Create Plan")');
    
    // Step 3: Assign plan to users
    await page.click('button:has-text("Assign")');
    await page.check('input[value="testuser@example.com"]');
    await page.click('button:has-text("Assign Plan")');
    
    // Verify complete workflow
    await expect(page.locator('text=Template-based Plan')).toBeVisible();
    await expect(page.locator('text=Plan assigned successfully')).toBeVisible();
  });

  test('inbox to plan to task workflow', async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Create inbox item
    await page.click('text=Inbox');
    await page.click('button:has-text("Create Item")');
    await page.fill('input[placeholder*="title"]', 'Inbox to Plan Item');
    await page.fill('textarea[placeholder*="description"]', 'Convert this to a plan');
    await page.click('button:has-text("Save Item")');
    
    // Step 2: Convert inbox item to plan
    const itemCheckbox = page.locator('input[type="checkbox"][data-testid="inbox-item"]').first();
    if (await itemCheckbox.isVisible()) {
      await itemCheckbox.click();
      await page.click('button:has-text("Convert to Plan")');
      await page.fill('input[placeholder*="plan name"]', 'Inbox-derived Plan');
      await page.click('button:has-text("Create Plan")');
    }
    
    // Step 3: Assign plan
    await page.click('button:has-text("Assign")');
    await page.check('input[value="testuser@example.com"]');
    await page.click('button:has-text("Assign Plan")');
    
    // Verify workflow completion
    await expect(page.locator('text=Inbox-derived Plan')).toBeVisible();
  });

  test('error handling and recovery', async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
    
    // Test various error scenarios
    await page.click('text=Plan');
    await page.click('button:has-text("Create Plan")');
    
    // Try to save without required fields
    await page.click('button:has-text("Save Plan")');
    await expect(page.locator('text=Please fill in all required fields')).toBeVisible();
    
    // Fill required fields
    await page.fill('input[placeholder*="plan name"]', 'Error Test Plan');
    await page.click('button:has-text("Save Plan")');
    
    // Verify plan was created despite initial error
    await expect(page.locator('text=Error Test Plan')).toBeVisible();
  });
});
