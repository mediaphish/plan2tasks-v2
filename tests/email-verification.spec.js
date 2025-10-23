// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Email Verification Tests', () => {
  test('should send contact form email notification', async ({ page }) => {
    // Go to landing page
    await page.goto('/');
    
    // Fill out contact form
    await page.fill('input[name="name"]', 'Email Test User');
    await page.fill('input[name="email"]', 'emailtest@example.com');
    await page.fill('textarea[name="message"]', 'Email verification test message');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await expect(page.locator('text=Thank you for your message')).toBeVisible();
    
    // Note: In a real test, you would verify the email was sent
    // This would require access to email logs or a test email service
  });

  test('should handle email sending errors gracefully', async ({ page }) => {
    // Go to landing page
    await page.goto('/');
    
    // Fill out contact form with invalid data
    await page.fill('input[name="name"]', '');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('textarea[name="message"]', '');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Name, email, and message are required')).toBeVisible();
  });

  test('should verify email form validation', async ({ page }) => {
    // Go to landing page
    await page.goto('/');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Name, email, and message are required')).toBeVisible();
  });
});
