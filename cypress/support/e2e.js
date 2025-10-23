// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
Cypress.on('window:before:load', (win) => {
  // Mock fetch to prevent actual API calls during tests
  win.fetch = cy.stub();
});

// Add custom commands
Cypress.Commands.add('loginAsAdmin', () => {
  cy.visit('/?plannerEmail=bartpaden@gmail.com');
  cy.wait(1000); // Wait for app to load
});

Cypress.Commands.add('loginAsUser', (userEmail = 'testuser@example.com') => {
  cy.visit(`/?user=${userEmail}`);
  cy.wait(1000); // Wait for app to load
});

Cypress.Commands.add('goToLandingPage', () => {
  cy.visit('/');
  cy.wait(1000); // Wait for app to load
});

Cypress.Commands.add('mockApiResponse', (method, url, response) => {
  cy.intercept(method, url, response).as('apiCall');
});

Cypress.Commands.add('waitForApiCall', (alias) => {
  cy.wait(`@${alias}`);
});
