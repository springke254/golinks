import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import LoginForm from '../components/auth/LoginForm';

// Mock the auth hook
const mockLogin = jest.fn();
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
  }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

function renderWithRouter(ui) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('LoginForm', () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it('renders email and password inputs', () => {
    renderWithRouter(<LoginForm />);
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    renderWithRouter(<LoginForm />);
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('renders OAuth buttons', () => {
    renderWithRouter(<LoginForm />);
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in with github/i)).toBeInTheDocument();
  });

  it('renders links to signup and forgot password', () => {
    renderWithRouter(<LoginForm />);
    expect(screen.getByText(/^sign up$/i)).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty form submission', async () => {
    renderWithRouter(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });
});
