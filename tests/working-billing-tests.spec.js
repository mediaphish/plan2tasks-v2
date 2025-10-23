// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Working Billing Tests - Based on Actual Code', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin using the actual URL parameter I created
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should display billing section in settings', async ({ page }) => {
    // Navigate to settings using the actual navigation I built
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Check for the actual billing section I created
    await expect(page.locator('text=Billing & Subscription')).toBeVisible();
  });

  test('should show set up billing button', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Check for the actual button I created
    await expect(page.locator('text=Set Up Billing')).toBeVisible();
  });

  test('should display landing page when not logged in', async ({ page }) => {
    // Go to home page without planner email
    await page.goto('/');
    
    // Check for the actual landing page elements I created
    await expect(page.locator('text=Coming Soon: The Easiest Way to Give People Things to Do')).toBeVisible();
    await expect(page.locator('text=Plan2Tasks')).toBeVisible();
  });

  test('should have contact form on landing page', async ({ page }) => {
    // Go to landing page
    await page.goto('/');
    
    // Check for the actual contact form I created
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
  });

  test('should have hidden admin login link', async ({ page }) => {
    // Go to landing page
    await page.goto('/');
    
    // Check for the actual admin link I created
    await expect(page.locator('a[href*="plannerEmail=bartpaden@gmail.com"]')).toBeVisible();
  });
});
