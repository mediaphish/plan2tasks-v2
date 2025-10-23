// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Landing Page Tests', () => {
  test('should display landing page correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check if landing page elements are present
    await expect(page.locator('h1')).toContainText('Coming Soon: The Easiest Way to Give People Things to Do');
    await expect(page.locator('img[alt="Plan2Tasks"]')).toBeVisible();
    await expect(page.locator('text=Archetype Original')).toBeVisible();
  });

  test('should have working contact form', async ({ page }) => {
    await page.goto('/');
    
    // Fill out contact form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'This is a test message');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success message
    await expect(page.locator('text=Thank you for your message')).toBeVisible();
  });

  test('should have working waitlist form', async ({ page }) => {
    await page.goto('/');
    
    // Fill out waitlist form
    await page.fill('input[id="email"]', 'waitlist@example.com');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success message
    await expect(page.locator('text=Thanks for joining the waitlist')).toBeVisible();
  });

  test('should have hidden admin login link', async ({ page }) => {
    await page.goto('/');
    
    // Check for hidden admin link
    await expect(page.locator('a[href*="plannerEmail=bartpaden@gmail.com"]')).toBeVisible();
  });
});
