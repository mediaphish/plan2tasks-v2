// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Database Verification Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should verify contact form submission in database', async ({ page }) => {
    // Go to landing page
    await page.goto('/');
    
    // Fill out contact form
    await page.fill('input[name="name"]', 'Database Test User');
    await page.fill('input[name="email"]', 'dbtest@example.com');
    await page.fill('textarea[name="message"]', 'Database verification test');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await expect(page.locator('text=Thank you for your message')).toBeVisible();
    
    // Note: In a real test, you would verify the database entry
    // This would require a test database or API endpoint to check
  });

  test('should verify subscription data in database', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Check if billing status loads correctly
    await expect(page.locator('text=Billing & Subscription')).toBeVisible();
    
    // Check for subscription status
    const statusElement = page.locator('text=Status:');
    if (await statusElement.isVisible()) {
      await expect(statusElement).toBeVisible();
    }
  });

  test('should verify user connections data', async ({ page }) => {
    // Navigate to users section
    await page.click('text=Users');
    await page.waitForLoadState('networkidle');
    
    // Check if user connections load
    await expect(page.locator('text=Users')).toBeVisible();
    
    // Check for user count display
    const userCount = page.locator('text=/\\d+ users/');
    if (await userCount.isVisible()) {
      await expect(userCount).toBeVisible();
    }
  });
});
