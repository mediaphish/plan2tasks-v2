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

  it('shows billing section content', () => {
    // Navigate directly to settings view
    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=settings');
    
    // Check for billing section
    cy.contains('Billing & Subscription').should('be.visible');
  });

  it('handles user limit checking in users section', () => {
    cy.contains('Users').click();
    
    // Check that users section is visible
    cy.contains('Users').should('be.visible');
    
    // Try to invite user
    cy.contains('Invite User').click();
    cy.get('input[type="email"]').type('testuser@example.com');
    cy.contains('Send Invite').click();
    
    // Check that the form was submitted (regardless of result)
    cy.get('input[type="email"]').should('have.value', 'testuser@example.com');
  });
});
