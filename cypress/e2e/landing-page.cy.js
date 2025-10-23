describe('Landing Page Tests', () => {
  beforeEach(() => {
    cy.goToLandingPage();
  });

  it('displays landing page correctly', () => {
    cy.contains('Coming Soon: The Easiest Way to Give People Things to Do').should('be.visible');
    cy.contains('Plan2Tasks').should('be.visible');
    cy.contains('Archetype Original').should('be.visible');
  });

  it('has working contact form', () => {
    cy.fillContactForm('Test User', 'test@example.com', 'This is a test message');
    cy.get('button[type="submit"]').click();
    
    // Mock the API response
    cy.intercept('POST', '/api/contact/send', {
      statusCode: 200,
      body: { ok: true, message: 'Thank you for your message. We\'ll get back to you soon!' }
    }).as('contactForm');
    
    cy.wait('@contactForm');
    cy.contains('Thank you for your message').should('be.visible');
  });

  it('has working waitlist form', () => {
    cy.fillWaitlistForm('waitlist@example.com');
    cy.get('button[type="submit"]').click();
    
    // Mock the API response
    cy.intercept('POST', '/api/contact/send', {
      statusCode: 200,
      body: { ok: true, message: 'Thanks for joining the waitlist!' }
    }).as('waitlistForm');
    
    cy.wait('@waitlistForm');
    cy.contains('Thanks for joining the waitlist').should('be.visible');
  });

  it('has hidden admin login link', () => {
    cy.checkAdminLoginLink();
  });

  it('navigates to admin dashboard via login link', () => {
    cy.get('a[href*="plannerEmail=bartpaden@gmail.com"]').click();
    cy.url().should('include', 'plannerEmail=bartpaden@gmail.com');
    cy.contains('Dashboard').should('be.visible');
  });
});
