// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to fill contact form
Cypress.Commands.add('fillContactForm', (name, email, message) => {
  cy.get('input[name="name"]').type(name);
  cy.get('input[name="email"]').type(email);
  cy.get('textarea[name="message"]').type(message);
});

// Custom command to fill waitlist form
Cypress.Commands.add('fillWaitlistForm', (email) => {
  cy.get('input[id="email"]').type(email);
});

// Custom command to navigate to settings
Cypress.Commands.add('navigateToSettings', () => {
  cy.contains('Settings').click();
  cy.wait(1000);
});

// Custom command to navigate to users
Cypress.Commands.add('navigateToUsers', () => {
  cy.contains('Users').click();
  cy.wait(1000);
});

// Custom command to check for billing section
Cypress.Commands.add('checkBillingSection', () => {
  cy.contains('Billing & Subscription').should('be.visible');
});

// Custom command to check for admin login link
Cypress.Commands.add('checkAdminLoginLink', () => {
  cy.get('a[href*="plannerEmail=bartpaden@gmail.com"]').should('be.visible');
});
