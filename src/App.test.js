import { render, screen } from '@testing-library/react';

import App from './App';

// Silence react-hot-toast portal warnings in tests
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

// Mock the auth hook so the app doesn't attempt real API calls
jest.mock('./hooks/useAuth', () => {
  const React = require('react');
  return {
    useAuth: () => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
      refreshUser: jest.fn(),
    }),
    AuthProvider: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

test('renders login page by default when unauthenticated', () => {
  render(<App />);
  expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
});
