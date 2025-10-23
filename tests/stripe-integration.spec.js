// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Stripe Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should handle Stripe test card payment', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Click on a subscription button
    const subscribeButton = page.locator('button:has-text("Subscribe")').first();
    if (await subscribeButton.isVisible()) {
      await subscribeButton.click();
      
      // Wait for Stripe checkout
      await page.waitForURL(/checkout.stripe.com/);
      
      // Fill out test card details
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.fill('[data-testid="billing-name"]', 'Test User');
      
      // Submit payment
      await page.click('[data-testid="submit"]');
      
      // Should redirect back to app
      await page.waitForURL(/plan2tasks.com/);
    }
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Click on a subscription button
    const subscribeButton = page.locator('button:has-text("Subscribe")').first();
    if (await subscribeButton.isVisible()) {
      await subscribeButton.click();
      
      // Wait for Stripe checkout
      await page.waitForURL(/checkout.stripe.com/);
      
      // Fill out declined card details
      await page.fill('[data-testid="card-number"]', '4000000000000002');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      
      // Submit payment
      await page.click('[data-testid="submit"]');
      
      // Should show error message
      await expect(page.locator('text=Your card was declined')).toBeVisible();
    }
  });

  test('should redirect to customer portal', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Click manage billing if available
    const manageButton = page.locator('text=Manage Billing');
    if (await manageButton.isVisible()) {
      await manageButton.click();
      
      // Should redirect to Stripe customer portal
      await page.waitForURL(/billing.stripe.com/);
    }
  });
});
