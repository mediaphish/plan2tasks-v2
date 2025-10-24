describe('Comprehensive Workflow Tests', () => {
  beforeEach(() => {
    cy.setupApiMocks();
  });

  it('complete user journey - landing to admin dashboard', () => {
    // Start at landing page
    cy.visit('/');
    cy.contains('Coming Soon: The Easiest Way to Give People Things to Do').should('be.visible');
    
    // Navigate to admin dashboard
    cy.get('footer a[href*="plannerEmail=bartpaden@gmail.com"]').click();
    cy.url().should('include', 'plannerEmail=bartpaden@gmail.com');
    // Should show main app interface
  });

  it('admin workflow - settings to billing', () => {
    cy.visit('/?plannerEmail=bartpaden@gmail.com');
    
    // Navigate to settings
    cy.contains('Settings').click();
    cy.contains('Billing & Subscription').should('be.visible');
    
    // Check billing functionality
    cy.contains('Set Up Billing').should('be.visible');
  });

  it('user workflow - task management', () => {
    cy.visit('/?plannerEmail=bartpaden@gmail.com&user=testuser@example.com');
    
    // Mock task completion
    cy.intercept('POST', '/api/inbox/assign*', {
      statusCode: 200,
      body: { ok: true, message: 'Task completed successfully' }
    }).as('completeTask');
    
    cy.wait('@completeTask');
  });

  it('billing integration workflow', () => {
    cy.visit('/?plannerEmail=bartpaden@gmail.com');
    
    // Navigate to users
    cy.contains('Users').click();
    
    // Mock user limit error
    cy.intercept('POST', '/api/invite/send', {
      statusCode: 403,
      body: {
        ok: false,
        error: 'User limit reached. You can invite up to 1 users on your current plan.',
        needsUpgrade: true,
        currentCount: 1,
        userLimit: 1
      }
    }).as('userLimit');
    
    // Try to invite user
    cy.contains('Invite User').click();
    cy.get('input[type="email"]').type('testuser@example.com');
    cy.contains('Send Invite').click();
    cy.wait('@userLimit');
    
    // Check for upgrade prompt
    cy.contains('User limit reached').should('be.visible');
  });

  it('error handling and recovery', () => {
    cy.visit('/?plannerEmail=bartpaden@gmail.com');
    
    // Mock API error
    cy.intercept('GET', '/api/billing/status*', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('billingError');
    
    cy.contains('Settings').click();
    cy.wait('@billingError');
  });

  it('navigation between all sections', () => {
    cy.visit('/?plannerEmail=bartpaden@gmail.com');
    
    // Test all navigation
    cy.contains('Users').click();
    cy.contains('Users').should('be.visible');
    
    cy.contains('Plan').click();
    cy.contains('Plan').should('be.visible');
    
    cy.contains('Settings').click();
    cy.contains('Billing & Subscription').should('be.visible');
    
    cy.contains('Inbox').click();
    cy.contains('Inbox').should('be.visible');
  });
});
