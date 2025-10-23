import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock the App component since it's a large component
// We'll test specific functionality rather than the entire component

describe('App Component', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    // Reset window.location
    delete window.location;
    window.location = { search: '', href: 'https://plan2tasks.com' };
  });

  test('renders landing page when no plannerEmail', () => {
    // Mock no plannerEmail in URL or localStorage
    window.location.search = '';
    localStorage.clear();
    
    render(<App />);
    
    // Check for landing page elements
    expect(screen.getByText('Coming Soon: The Easiest Way to Give People Things to Do')).toBeInTheDocument();
    expect(screen.getByText('Plan2Tasks')).toBeInTheDocument();
  });

  test('renders admin dashboard when plannerEmail is set', () => {
    // Mock plannerEmail in URL
    window.location.search = '?plannerEmail=bartpaden@gmail.com';
    
    render(<App />);
    
    // Check for admin dashboard elements
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('handles localStorage plannerEmail', () => {
    // Mock plannerEmail in localStorage
    localStorage.setItem('plannerEmail', 'bartpaden@gmail.com');
    window.location.search = '';
    
    render(<App />);
    
    // Check for admin dashboard elements
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

describe('URL Parameter Handling', () => {
  test('extracts plannerEmail from URL', () => {
    window.location.search = '?plannerEmail=test@example.com';
    
    render(<App />);
    
    // Should show admin dashboard
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('extracts user parameter from URL', () => {
    window.location.search = '?user=testuser@example.com';
    
    render(<App />);
    
    // Should show user dashboard
    expect(screen.getByText('Your Tasks')).toBeInTheDocument();
  });
});

describe('Navigation', () => {
  test('navigates to settings', () => {
    window.location.search = '?plannerEmail=bartpaden@gmail.com';
    
    render(<App />);
    
    // Click settings
    screen.getByText('Settings').click();
    
    // Check for settings content
    expect(screen.getByText('Billing & Subscription')).toBeInTheDocument();
  });

  test('navigates to users', () => {
    window.location.search = '?plannerEmail=bartpaden@gmail.com';
    
    render(<App />);
    
    // Click users
    screen.getByText('Users').click();
    
    // Check for users content
    expect(screen.getByText('Users')).toBeInTheDocument();
  });
});
