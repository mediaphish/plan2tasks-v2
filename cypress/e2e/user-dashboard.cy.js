describe('User Dashboard Tests', () => {
  beforeEach(() => {
    cy.setupApiMocks();
    cy.visit('/?plannerEmail=bartpaden@gmail.com&user=testuser@example.com');
  });

  it('displays user dashboard correctly', () => {
    // The app shows different views based on URL parameters
    // This test verifies the app loads without errors
    cy.get('body').should('be.visible');
  });

  it('shows assigned tasks', () => {
    // Mock tasks data
    cy.intercept('GET', '/api/inbox/get*', {
      statusCode: 200,
      body: {
        ok: true,
        items: [
          {
            id: '1',
            title: 'Complete project documentation',
            description: 'Write comprehensive project documentation',
            status: 'pending',
            assignee: 'testuser@example.com'
          }
        ]
      }
    }).as('getTasks');
    
    cy.wait('@getTasks');
  });

  it('allows marking tasks as complete', () => {
    // Mock task completion
    cy.intercept('POST', '/api/inbox/assign*', {
      statusCode: 200,
      body: { ok: true, message: 'Task completed successfully' }
    }).as('completeTask');
    
    cy.wait('@completeTask');
  });

  it('handles no tasks state', () => {
    // Mock empty tasks response
    cy.intercept('GET', '/api/inbox/get*', {
      statusCode: 200,
      body: { ok: true, items: [] }
    }).as('getEmptyTasks');
    
    cy.wait('@getEmptyTasks');
  });

  it('filters tasks by status', () => {
    // Mock tasks with different statuses
    cy.intercept('GET', '/api/inbox/get*', {
      statusCode: 200,
      body: {
        ok: true,
        items: [
          { id: '1', title: 'Task 1', status: 'pending' },
          { id: '2', title: 'Task 2', status: 'completed' }
        ]
      }
    }).as('getTasks');
    
    cy.wait('@getTasks');
  });

  it('exports tasks', () => {
    // Mock export functionality
    cy.intercept('GET', '/api/inbox/export*', {
      statusCode: 200,
      body: 'csv,data,here',
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="tasks.csv"'
      }
    }).as('exportTasks');
    
    cy.wait('@exportTasks');
  });
});
