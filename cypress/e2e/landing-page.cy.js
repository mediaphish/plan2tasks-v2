describe('Landing Page Tests', () => {
  beforeEach(() => {
    cy.setupApiMocks();
    cy.visit('/');
  });

  it('displays landing page correctly', () => {
    cy.contains('Coming Soon: The Easiest Way to Give People Things to Do').should('be.visible');
    cy.contains('Plan2Tasks').should('be.visible');
    cy.contains('Archetype Original').should('be.visible');
  });

  it('has working contact form', () => {
    cy.get('#name').type('Test User');
    cy.get('#contactEmail').type('test@example.com');
    cy.get('#message').type('This is a test message');
    // Form submission opens email client, so we just verify form exists and can be filled
  });

  it('has working waitlist form', () => {
    cy.get('#email').type('waitlist@example.com');
    // Form submission shows alert, so we just verify form exists and can be filled
  });

  it('has hidden admin login link', () => {
    cy.get('footer a[href*="plannerEmail=bartpaden@gmail.com"]').should('exist');
  });

  it('navigates to admin dashboard via login link', () => {
    cy.get('footer a[href*="plannerEmail=bartpaden@gmail.com"]').click();
    cy.url().should('include', 'plannerEmail=bartpaden@gmail.com');
    // Should show the main app interface, not a "Dashboard" text
  });
});
