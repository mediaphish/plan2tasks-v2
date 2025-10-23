describe('Comprehensive Workflow Tests', () => {
  it('complete user journey - landing to admin dashboard', () => {
    // Start at landing page
    cy.goToLandingPage();
    cy.contains('Coming Soon: The Easiest Way to Give People Things to Do').should('be.visible');
    
    // Navigate to admin dashboard
    cy.checkAdminLoginLink();
    cy.get('a[href*="plannerEmail=bartpaden@gmail.com"]').click();
    cy.url().should('include', 'plannerEmail=bartpaden@gmail.com');
    cy.contains('Dashboard').should('be.visible');
  });

  it('admin workflow - settings to billing', () => {
    cy.loginAsAdmin();
    
    // Navigate to settings
    cy.navigateToSettings();
    cy.checkBillingSection();
    
    // Check billing functionality
    cy.contains('Set Up Billing').should('be.visible');
  });

  it('user workflow - task management', () => {
    cy.loginAsUser();
    
    // Check user dashboard
    cy.contains('Your Tasks').should('be.visible');
    
    // Mock task completion
    cy.intercept('POST', '/api/inbox/assign*', {
      statusCode: 200,
      body: { ok: true, message: 'Task completed successfully' }
    }).as('completeTask');
    
    // Complete a task
    cy.get('input[type="checkbox"]').first().check();
    cy.wait('@completeTask');
    cy.contains('Task completed').should('be.visible');
  });

  it('billing integration workflow', () => {
    cy.loginAsAdmin();
    
    // Navigate to users
    cy.navigateToUsers();
    
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
    cy.contains('Invite').click();
    cy.get('input[type="email"]').type('testuser@example.com');
    cy.contains('Send Invite').click();
    cy.wait('@userLimit');
    
    // Check for upgrade prompt
    cy.contains('User limit reached').should('be.visible');
    cy.contains('Upgrade your plan').should('be.visible');
  });

  it('error handling and recovery', () => {
    cy.loginAsAdmin();
    
    // Mock API error
    cy.intercept('GET', '/api/billing/status*', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('billingError');
    
    cy.navigateToSettings();
    cy.wait('@billingError');
    
    // Should handle error gracefully
    cy.contains('Loading billing status').should('be.visible');
  });

  it('navigation between all sections', () => {
    cy.loginAsAdmin();
    
    // Test all navigation
    cy.contains('Dashboard').click();
    cy.contains('Dashboard').should('be.visible');
    
    cy.contains('Users').click();
    cy.contains('Users').should('be.visible');
    
    cy.contains('Settings').click();
    cy.contains('Billing & Subscription').should('be.visible');
    
    cy.contains('Templates').click();
    cy.contains('Templates').should('be.visible');
  });
});
