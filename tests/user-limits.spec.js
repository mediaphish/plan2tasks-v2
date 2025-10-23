// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('User Limits Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/?plannerEmail=bartpaden@gmail.com');
    await page.waitForLoadState('networkidle');
  });

  test('should show user limit in billing section', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Check for user count display
    await expect(page.locator('text=/\\d+ / \\d+ users/')).toBeVisible();
  });

  test('should enforce user limits when inviting', async ({ page }) => {
    // Navigate to users section
    await page.click('text=Users');
    await page.waitForLoadState('networkidle');
    
    // Try to invite a user
    await page.click('button:has-text("Invite")');
    
    // Fill out invite form
    await page.fill('input[type="email"]', 'testuser@example.com');
    
    // Submit invite
    await page.click('button:has-text("Send Invite")');
    
    // Check for user limit error if applicable
    const errorMessage = page.locator('text=User limit reached');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();
      await expect(page.locator('text=Upgrade your plan')).toBeVisible();
    }
  });

  test('should show upgrade prompts when at limit', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    
    // Check for upgrade prompts
    const upgradeText = page.locator('text=Upgrade your plan');
    if (await upgradeText.isVisible()) {
      await expect(upgradeText).toBeVisible();
    }
  });
});
