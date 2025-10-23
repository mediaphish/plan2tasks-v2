// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('AI Planning Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should generate AI plan', async ({ page }) => {
    // Navigate to plan creation
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Click AI planning
    await page.click('button:has-text("AI Planning")');
    
    // Enter planning prompt
    await page.fill('textarea[placeholder*="describe"]', 'Create a project plan for launching a new website');
    
    // Generate plan
    await page.click('button:has-text("Generate Plan")');
    
    // Wait for AI response
    await page.waitForSelector('text=Plan generated', { timeout: 30000 });
    
    // Verify plan was created
    await expect(page.locator('text=Website Launch Plan')).toBeVisible();
    await expect(page.locator('text=Design website')).toBeVisible();
    await expect(page.locator('text=Develop content')).toBeVisible();
  });

  test('should suggest deadlines', async ({ page }) => {
    // Navigate to plan creation
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Create a plan
    await page.click('button:has-text("Create Plan")');
    await page.fill('input[placeholder*="plan name"]', 'Deadline Test Plan');
    
    // Add tasks
    await page.click('button:has-text("Add Task")');
    await page.fill('input[placeholder*="task"]', 'Complete project setup');
    
    // Click suggest deadlines
    await page.click('button:has-text("Suggest Deadlines")');
    
    // Wait for AI suggestions
    await page.waitForSelector('text=Deadlines suggested', { timeout: 15000 });
    
    // Verify deadlines were added
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });

  test('should handle AI planning errors', async ({ page }) => {
    // Navigate to plan creation
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Click AI planning
    await page.click('button:has-text("AI Planning")');
    
    // Enter invalid prompt
    await page.fill('textarea[placeholder*="describe"]', '');
    
    // Try to generate
    await page.click('button:has-text("Generate Plan")');
    
    // Check for error
    await expect(page.locator('text=Please enter a planning prompt')).toBeVisible();
  });

  test('should customize AI suggestions', async ({ page }) => {
    // Navigate to plan creation
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Click AI planning
    await page.click('button:has-text("AI Planning")');
    
    // Enter prompt
    await page.fill('textarea[placeholder*="describe"]', 'Create a marketing campaign plan');
    
    // Set preferences
    await page.selectOption('select[name="planning_mode"]', 'full-ai');
    await page.check('input[name="include_deadlines"]');
    await page.check('input[name="include_assignments"]');
    
    // Generate plan
    await page.click('button:has-text("Generate Plan")');
    
    // Wait for response
    await page.waitForSelector('text=Plan generated', { timeout: 30000 });
    
    // Verify customized plan
    await expect(page.locator('text=Marketing Campaign Plan')).toBeVisible();
  });

  test('should save AI-generated plan', async ({ page }) => {
    // Navigate to plan creation
    await page.click('text=Plan');
    await page.waitForLoadState('networkidle');
    
    // Generate AI plan
    await page.click('button:has-text("AI Planning")');
    await page.fill('textarea[placeholder*="describe"]', 'Create a training program plan');
    await page.click('button:has-text("Generate Plan")');
    
    // Wait for generation
    await page.waitForSelector('text=Plan generated', { timeout: 30000 });
    
    // Save plan
    await page.click('button:has-text("Save Plan")');
    
    // Verify plan was saved
    await expect(page.locator('text=Plan saved successfully')).toBeVisible();
  });
});
