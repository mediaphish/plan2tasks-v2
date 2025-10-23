// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Billing System Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should display billing section in settings', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Check for billing section
    await expect(page.locator('text=Billing & Subscription')).toBeVisible();
  });

  test('should create customer successfully', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Click set up billing if needed
    const setupButton = page.locator('text=Set Up Billing');
    if (await setupButton.isVisible()) {
      await setupButton.click();
      await page.waitForTimeout(2000); // Wait for API call
    }
    
    // Check for customer creation success
    await expect(page.locator('text=Customer created successfully')).toBeVisible();
  });

  test('should show subscription options for free users', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Check for upgrade options
    await expect(page.locator('text=Upgrade your plan')).toBeVisible();
    await expect(page.locator('text=Starter')).toBeVisible();
    await expect(page.locator('text=Professional')).toBeVisible();
    await expect(page.locator('text=Business')).toBeVisible();
  });

  test('should redirect to Stripe checkout on subscription', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Click on a subscription button
    const subscribeButton = page.locator('button:has-text("Subscribe")').first();
    if (await subscribeButton.isVisible()) {
      await subscribeButton.click();
      
      // Should redirect to Stripe checkout
      await page.waitForURL(/checkout.stripe.com/);
    }
  });
});
