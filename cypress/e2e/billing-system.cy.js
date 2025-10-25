describe('Billing System Tests', () => {
  beforeEach(() => {
    cy.setupApiMocks();
    cy.visit('/?plannerEmail=bartpaden@gmail.com');
    // Wait for dashboard to load by looking for the dashboard header
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
  });

  it('displays billing section in settings', () => {
    // Navigate directly to settings view
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    
    // Check that the billing section is visible
    cy.contains('Billing & Subscription').should('be.visible');
  });

  it('shows loading state when billing status is loading', () => {
    // Navigate directly to settings view
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    
    // Check for loading state (this is what actually shows initially)
    cy.contains('Loading billing status...').should('be.visible');
  });

  it('shows billing content when API returns data', () => {
    // Navigate directly to settings view
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    
    // Wait for API call to complete and check for actual billing content
    cy.contains('Free Plan').should('be.visible');
    cy.contains('0 / 1 users').should('be.visible');
    cy.contains('Status: active').should('be.visible');
  });

  it('shows upgrade options for free users', () => {
    // Navigate directly to settings view
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    
    // Wait for billing content to load
    cy.contains('Free Plan').should('be.visible');
    
    // Check for upgrade options (these should be visible for free users)
    cy.contains('Upgrade your plan:').should('be.visible');
  });

  it('handles user limit checking in users section', () => {
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
    
    // Check for user limit error message
    cy.contains('User limit reached').should('be.visible');
  });
});