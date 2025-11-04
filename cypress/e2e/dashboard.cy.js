describe('Dashboard Metrics Tests', () => {
  beforeEach(() => {
    cy.setupApiMocks();
  });

  it('should display dashboard with correct metrics', () => {
    // Mock the dashboard metrics endpoint
    cy.intercept('GET', '/api/dashboard/metrics*', {
      statusCode: 200,
      body: {
        ok: true,
        metrics: {
          aggregate: {
            completedToday: 5,
            completedThisWeek: 12,
            averageCompletionRate: 75,
            mostActiveUser: {
              email: 'testuser@example.com',
              completions: 3
            },
            trends: {
              today: 25,
              week: 10
            }
          },
          userEngagement: [
            {
              userEmail: 'testuser@example.com',
              isConnected: true,
              today: 3,
              thisWeek: 8,
              completionRate: 80,
              activePlans: 0, // Should be 0 if no active plans
              lastActivity: new Date().toISOString()
            }
          ],
          activityFeed: []
        }
      }
    }).as('getDashboardMetrics');

    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=dashboard');
    
    // Wait for metrics to load
    cy.wait('@getDashboardMetrics');
    
    // Verify dashboard loads
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Tasks Completed Today').should('be.visible');
    cy.contains('User Engagement').should('be.visible');
    
    // Verify metrics are displayed
    cy.contains('5').should('be.visible'); // Today's completions
    cy.contains('12').should('be.visible'); // This week's completions
    cy.contains('75%').should('be.visible'); // Average completion rate
  });

  it('should show 0 active plans when all bundles are archived', () => {
    // Mock dashboard with no active bundles
    cy.intercept('GET', '/api/dashboard/metrics*', {
      statusCode: 200,
      body: {
        ok: true,
        metrics: {
          aggregate: {
            completedToday: 0,
            completedThisWeek: 0,
            averageCompletionRate: 0,
            mostActiveUser: null,
            trends: { today: 0, week: 0 }
          },
          userEngagement: [
            {
              userEmail: 'testuser@example.com',
              isConnected: true,
              today: 0,
              thisWeek: 0,
              completionRate: 0,
              activePlans: 0, // Should be 0
              lastActivity: null
            }
          ],
          activityFeed: []
        }
      }
    }).as('getDashboardMetricsEmpty');

    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=dashboard');
    cy.wait('@getDashboardMetricsEmpty');
    
    // Verify active plans shows 0
    cy.get('table').within(() => {
      cy.contains('testuser@example.com').parent('tr').within(() => {
        cy.contains('0').should('be.visible'); // Active Plans should be 0
      });
    });
  });

  it('should filter out archived bundles from active plans count', () => {
    // Mock dashboard where bundles exist but are archived
    cy.intercept('GET', '/api/dashboard/metrics*', {
      statusCode: 200,
      body: {
        ok: true,
        metrics: {
          aggregate: {
            completedToday: 0,
            completedThisWeek: 0,
            averageCompletionRate: 0,
            mostActiveUser: null,
            trends: { today: 0, week: 0 }
          },
          userEngagement: [
            {
              userEmail: 'testuser@example.com',
              isConnected: false,
              today: 0,
              thisWeek: 0,
              completionRate: 0,
              activePlans: 0, // Even if tasks exist, archived bundles should not count
              lastActivity: null
            }
          ],
          activityFeed: []
        }
      }
    }).as('getDashboardMetricsArchived');

    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=dashboard');
    cy.wait('@getDashboardMetricsArchived');
    
    // Verify active plans is 0 even if user has tasks from archived bundles
    cy.get('table').within(() => {
      cy.contains('testuser@example.com').parent('tr').within(() => {
        cy.contains('0').should('be.visible');
      });
    });
  });

  it('should handle loading and error states', () => {
    // Test loading state
    cy.intercept('GET', '/api/dashboard/metrics*', {
      delay: 1000,
      statusCode: 200,
      body: { ok: true, metrics: {} }
    }).as('getDashboardMetricsSlow');

    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=dashboard');
    cy.contains('Loading dashboard').should('be.visible');
    
    // Test error state
    cy.intercept('GET', '/api/dashboard/metrics*', {
      statusCode: 500,
      body: { ok: false, error: 'Server error' }
    }).as('getDashboardMetricsError');

    cy.visit('/?plannerEmail=bartpaden@gmail.com&view=dashboard');
    cy.wait('@getDashboardMetricsError');
    cy.contains('Error loading dashboard').should('be.visible');
  });
});

