describe('Billing System Tests', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it('displays billing section in settings', () => {
    cy.navigateToSettings();
    cy.checkBillingSection();
  });

  it('shows set up billing button for new users', () => {
    cy.navigateToSettings();
    cy.contains('Set Up Billing').should('be.visible');
  });

  it('creates customer successfully', () => {
    cy.navigateToSettings();
    
    // Mock the API response
    cy.intercept('POST', '/api/billing/create-customer', {
      statusCode: 200,
      body: { ok: true, customerId: 'cus_test123' }
    }).as('createCustomer');
    
    cy.contains('Set Up Billing').click();
    cy.wait('@createCustomer');
    cy.contains('Customer created successfully').should('be.visible');
  });

  it('shows subscription options for free users', () => {
    cy.navigateToSettings();
    
    // Mock billing status response
    cy.intercept('GET', '/api/billing/status*', {
      statusCode: 200,
      body: {
        ok: true,
        subscription: { plan_tier: 'free', status: 'active' },
        userCount: 0,
        userLimit: 1
      }
    }).as('billingStatus');
    
    cy.wait('@billingStatus');
    cy.contains('Upgrade your plan').should('be.visible');
    cy.contains('Starter').should('be.visible');
    cy.contains('Professional').should('be.visible');
    cy.contains('Business').should('be.visible');
  });

  it('handles subscription creation', () => {
    cy.navigateToSettings();
    
    // Mock subscription creation
    cy.intercept('POST', '/api/billing/create-subscription', {
      statusCode: 200,
      body: { ok: true, checkoutUrl: 'https://checkout.stripe.com/test' }
    }).as('createSubscription');
    
    cy.contains('Subscribe').first().click();
    cy.wait('@createSubscription');
    
    // Should redirect to Stripe checkout
    cy.url().should('include', 'checkout.stripe.com');
  });

  it('shows user limits and upgrade prompts', () => {
    cy.navigateToUsers();
    
    // Mock user limit response
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
    
    cy.contains('Invite').click();
    cy.get('input[type="email"]').type('testuser@example.com');
    cy.contains('Send Invite').click();
    cy.wait('@userLimit');
    
    cy.contains('User limit reached').should('be.visible');
    cy.contains('Upgrade your plan').should('be.visible');
  });
});
