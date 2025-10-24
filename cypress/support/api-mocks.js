// Comprehensive API mocks for all endpoints
// This file provides default mocks for all API endpoints to prevent undefined responses

// Mock all possible API endpoints with default responses
const setupApiMocks = () => {
  // Add a catch-all mock for any unmocked requests
  cy.intercept('GET', '/api/**', {
    statusCode: 200,
    body: { ok: true, message: 'Mocked GET response' }
  }).as('catchAllGet');

  cy.intercept('POST', '/api/**', {
    statusCode: 200,
    body: { ok: true, message: 'Mocked POST response' }
  }).as('catchAllPost');

  cy.intercept('PUT', '/api/**', {
    statusCode: 200,
    body: { ok: true, message: 'Mocked PUT response' }
  }).as('catchAllPut');

  cy.intercept('DELETE', '/api/**', {
    statusCode: 200,
    body: { ok: true, message: 'Mocked DELETE response' }
  }).as('catchAllDelete');

        // Billing API endpoints - must be more specific to override catch-all
        cy.intercept('GET', '/api/billing/status*', {
          statusCode: 200,
          body: {
            ok: true,
            subscription: { plan_tier: 'free', status: 'active' },
            userCount: 0,
            userLimit: 1
          }
        }).as('billingStatus');
        
        // Ensure billing status is called when settings view loads
        cy.intercept('GET', '/api/billing/status', {
          statusCode: 200,
          body: {
            ok: true,
            subscription: { plan_tier: 'free', status: 'active' },
            userCount: 0,
            userLimit: 1
          }
        }).as('billingStatusExact');
        
        // Also intercept with query parameters
        cy.intercept('GET', '/api/billing/status?plannerEmail=*', {
          statusCode: 200,
          body: {
            ok: true,
            subscription: { plan_tier: 'free', status: 'active' },
            userCount: 0,
            userLimit: 1
          }
        }).as('billingStatusWithEmail');

  cy.intercept('POST', '/api/billing/create-customer', {
    statusCode: 200,
    body: { ok: true, customerId: 'cus_test123' }
  }).as('createCustomer');

  cy.intercept('POST', '/api/billing/create-subscription', {
    statusCode: 200,
    body: { ok: true, checkoutUrl: 'https://checkout.stripe.com/test' }
  }).as('createSubscription');

  cy.intercept('POST', '/api/billing/portal', {
    statusCode: 200,
    body: { ok: true, url: 'https://billing.stripe.com/test' }
  }).as('openPortal');

        // User management endpoints
        cy.intercept('GET', '/api/users/list*', {
          statusCode: 200,
          body: { ok: true, users: [] }
        }).as('getUsers');

        // Dashboard users endpoint
        cy.intercept('GET', '/api/users*', {
          statusCode: 200,
          body: { ok: true, users: [] }
        }).as('getDashboardUsers');

  cy.intercept('POST', '/api/invite/send', {
    statusCode: 200,
    body: { ok: true, message: 'Invite sent successfully' }
  }).as('sendInvite');

  // Task/Inbox endpoints
  cy.intercept('GET', '/api/inbox/get*', {
    statusCode: 200,
    body: { ok: true, items: [] }
  }).as('getTasks');

  cy.intercept('POST', '/api/inbox/assign*', {
    statusCode: 200,
    body: { ok: true, message: 'Task assigned successfully' }
  }).as('assignTask');

  cy.intercept('GET', '/api/inbox/export*', {
    statusCode: 200,
    body: 'csv,data,here',
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="tasks.csv"'
    }
  }).as('exportTasks');

  // Contact form endpoint
  cy.intercept('POST', '/api/contact/send', {
    statusCode: 200,
    body: { ok: true, message: 'Thank you for your message' }
  }).as('sendContact');

        // Profile/Settings endpoints
        cy.intercept('GET', '/api/profile/get*', {
          statusCode: 200,
          body: { ok: true, prefs: {} }
        }).as('getProfile');

        // Prefs endpoint for dashboard
        cy.intercept('GET', '/api/prefs/get*', {
          statusCode: 200,
          body: { ok: true, prefs: { default_view: 'dashboard' } }
        }).as('getPrefs');

        // Planner profile endpoint
        cy.intercept('GET', '/api/planner/profile*', {
          statusCode: 200,
          body: { ok: true, profile: { planner_name: 'Test Planner', company_name: 'Test Company' } }
        }).as('getPlannerProfile');

  cy.intercept('POST', '/api/profile/save', {
    statusCode: 200,
    body: { ok: true, message: 'Profile saved successfully' }
  }).as('saveProfile');

  // Plan/Template endpoints
  cy.intercept('GET', '/api/plan/get*', {
    statusCode: 200,
    body: { ok: true, plan: null }
  }).as('getPlan');

  cy.intercept('POST', '/api/plan/save', {
    statusCode: 200,
    body: { ok: true, message: 'Plan saved successfully' }
  }).as('savePlan');

  // Template endpoints
  cy.intercept('GET', '/api/templates/list*', {
    statusCode: 200,
    body: { ok: true, templates: [] }
  }).as('getTemplates');

  cy.intercept('POST', '/api/templates/save', {
    statusCode: 200,
    body: { ok: true, message: 'Template saved successfully' }
  }).as('saveTemplate');
};

// Export for use in test files
Cypress.Commands.add('setupApiMocks', setupApiMocks);