describe('Billing System Tests', () => {
  beforeEach(() => {
    cy.setupApiMocks();
    cy.visit('/?plannerEmail=bartpaden@gmail.com');
    // Wait for dashboard to load by looking for the dashboard header
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
  });

  it('displays billing section in settings', () => {
    // Wait a bit more for the dashboard to fully render
    cy.wait(2000);
    
    // Debug: Check what buttons are actually on the page
    cy.get('button').then(($buttons) => {
      console.log('Found buttons:', $buttons.length);
      $buttons.each((i, btn) => {
        console.log(`Button ${i}:`, btn.textContent);
      });
    });
    
    // Try to find the Settings button by its structure
    cy.get('button').contains('Settings').should('be.visible');
    cy.get('button').contains('Settings').click();
    cy.contains('Billing & Subscription').should('be.visible');
  });

  it('shows set up billing button for new users', () => {
    cy.wait(2000);
    cy.contains('Settings').should('be.visible');
    cy.contains('Settings').click();
    cy.contains('Set Up Billing').should('be.visible');
  });

  it('creates customer successfully', () => {
    cy.wait(2000);
    cy.contains('Settings').should('be.visible');
    cy.contains('Settings').click();
    
    // Mock the API response
    cy.intercept('POST', '/api/billing/create-customer', {
      statusCode: 200,
      body: { ok: true, customerId: 'cus_test123' }
    }).as('createCustomer');
    
    cy.contains('Set Up Billing').click();
    cy.wait('@createCustomer');
  });

  it('shows subscription options for free users', () => {
    cy.wait(2000);
    cy.contains('Settings').should('be.visible');
    cy.contains('Settings').click();
    
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
    cy.wait(2000);
    cy.contains('Settings').should('be.visible');
    cy.contains('Settings').click();
    
    // Mock subscription creation
    cy.intercept('POST', '/api/billing/create-subscription', {
      statusCode: 200,
      body: { ok: true, checkoutUrl: 'https://checkout.stripe.com/test' }
    }).as('createSubscription');
    
    cy.contains('Subscribe').first().click();
    cy.wait('@createSubscription');
  });

  it('shows user limits and upgrade prompts', () => {
    cy.contains('Users').click();
    
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
    
    cy.contains('Invite User').click();
    cy.get('input[type="email"]').type('testuser@example.com');
    cy.contains('Send Invite').click();
    cy.wait('@userLimit');
    
    cy.contains('User limit reached').should('be.visible');
  });
});
