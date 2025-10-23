// Test utility functions
const { expect } = require('@playwright/test');

/**
 * Wait for API call to complete
 */
async function waitForApiCall(page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Fill out contact form
 */
async function fillContactForm(page, name, email, message) {
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('textarea[name="message"]', message);
}

/**
 * Fill out waitlist form
 */
async function fillWaitlistForm(page, email) {
  await page.fill('input[id="email"]', email);
}

/**
 * Login as admin
 */
async function loginAsAdmin(page) {
  await page.goto('/?plannerEmail=bartpaden@gmail.com');
  await waitForApiCall(page);
}

/**
 * Navigate to settings
 */
async function navigateToSettings(page) {
  await page.click('text=Settings');
  await waitForApiCall(page);
}

/**
 * Navigate to users
 */
async function navigateToUsers(page) {
  await page.click('text=Users');
  await waitForApiCall(page);
}

/**
 * Check for error messages
 */
async function checkForErrors(page) {
  const errorSelectors = [
    'text=Error',
    'text=Failed',
    'text=Something went wrong',
    'text=User limit reached',
    'text=Payment failed'
  ];
  
  for (const selector of errorSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      return true;
    }
  }
  return false;
}

/**
 * Take screenshot on failure
 */
async function takeScreenshotOnFailure(page, testName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshots/${testName}-${timestamp}.png`;
  await page.screenshot({ path: filename, fullPage: true });
}

module.exports = {
  waitForApiCall,
  fillContactForm,
  fillWaitlistForm,
  loginAsAdmin,
  navigateToSettings,
  navigateToUsers,
  checkForErrors,
  takeScreenshotOnFailure
};
