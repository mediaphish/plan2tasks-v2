describe('User Dashboard Tests', () => {
  beforeEach(() => {
    cy.loginAsUser();
  });

  it('displays user dashboard correctly', () => {
    cy.contains('Your Tasks').should('be.visible');
    cy.contains('Assigned Plans').should('be.visible');
    cy.contains('Task History').should('be.visible');
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
    cy.contains('Complete project documentation').should('be.visible');
  });

  it('allows marking tasks as complete', () => {
    // Mock task completion
    cy.intercept('POST', '/api/inbox/assign*', {
      statusCode: 200,
      body: { ok: true, message: 'Task completed successfully' }
    }).as('completeTask');
    
    cy.get('input[type="checkbox"]').first().check();
    cy.wait('@completeTask');
    cy.contains('Task completed').should('be.visible');
  });

  it('handles no tasks state', () => {
    // Mock empty tasks response
    cy.intercept('GET', '/api/inbox/get*', {
      statusCode: 200,
      body: { ok: true, items: [] }
    }).as('getEmptyTasks');
    
    cy.wait('@getEmptyTasks');
    cy.contains('No tasks assigned').should('be.visible');
    cy.contains('Check back later').should('be.visible');
  });

  it('filters tasks by status', () => {
    cy.get('select[name="status"]').select('pending');
    
    // Should show only pending tasks
    cy.get('[data-status="pending"]').should('be.visible');
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
    
    cy.contains('Export Tasks').click();
    cy.wait('@exportTasks');
  });
});
