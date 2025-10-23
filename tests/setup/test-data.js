// Test data setup and cleanup
const { test } = require('@playwright/test');

/**
 * Test data for different scenarios
 */
const testData = {
  contactForm: {
    valid: {
      name: 'Test User',
      email: 'test@example.com',
      message: 'This is a test message'
    },
    invalid: {
      name: '',
      email: 'invalid-email',
      message: ''
    }
  },
  waitlist: {
    valid: {
      email: 'waitlist@example.com'
    },
    invalid: {
      email: 'invalid-email'
    }
  },
  stripe: {
    testCards: {
      success: '4242424242424242',
      decline: '4000000000000002',
      insufficientFunds: '4000000000009995'
    },
    testDetails: {
      expiry: '12/25',
      cvc: '123',
      name: 'Test User'
    }
  }
};

/**
 * Clean up test data after tests
 */
async function cleanupTestData() {
  // In a real implementation, you would:
  // 1. Delete test contact submissions
  // 2. Cancel test subscriptions
  // 3. Remove test user connections
  // 4. Reset test planner data
  
  console.log('Test data cleanup completed');
}

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  // In a real implementation, you would:
  // 1. Set up test database
  // 2. Configure test email service
  // 3. Set up test Stripe account
  // 4. Initialize test data
  
  console.log('Test environment setup completed');
}

module.exports = {
  testData,
  cleanupTestData,
  setupTestEnvironment
};
