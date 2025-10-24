describe('Billing System Tests', () => {
  beforeEach(() => {
    cy.setupApiMocks();
    cy.visit('/?plannerEmail=bartpaden@gmail.com');
    // Wait for dashboard to load by looking for the dashboard header
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
  });

  it('displays billing section in settings', () => {
    // Wait for dashboard to load
    cy.wait(2000);
    
    // Take a screenshot to see what's actually on the page
    cy.screenshot('dashboard-state');
    
    // Log the entire page HTML to understand the structure
    cy.get('body').then(($body) => {
      console.log('Page HTML:', $body.html());
    });
    
    // Try to navigate to settings directly via URL instead of clicking
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    cy.contains('Billing & Subscription').should('be.visible');
  });

  it('shows set up billing button for new users', () => {
    // Navigate directly to settings view
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    cy.contains('Set Up Billing').should('be.visible');
  });

  it('creates customer successfully', () => {
    // Navigate directly to settings view
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    
    // Mock the API response
    cy.intercept('POST', '/api/billing/create-customer', {
      statusCode: 200,
      body: { ok: true, customerId: 'cus_test123' }
    }).as('createCustomer');
    
    cy.contains('Set Up Billing').click();
    cy.wait('@createCustomer');
  });

  it('shows subscription options for free users', () => {
    // Navigate directly to settings view
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    
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
    // Navigate directly to settings view
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    
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
