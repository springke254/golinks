import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import SignupForm from '../components/auth/SignupForm';

const mockSignup = jest.fn();
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signup: mockSignup,
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

describe('SignupForm', () => {
  beforeEach(() => {
    mockSignup.mockReset();
  });

  it('renders all input fields', () => {
    renderWithRouter(<SignupForm />);
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/create a password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument();
  });

  it('renders create account button', () => {
    renderWithRouter(<SignupForm />);
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders password strength indicator when typing', () => {
    renderWithRouter(<SignupForm />);
    const passwordInput = screen.getByPlaceholderText(/create a password/i);
    fireEvent.change(passwordInput, { target: { value: 'Abcdefg' } });
    // Strength bar segments should be visible
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
  });

  it('renders link to sign in', () => {
    renderWithRouter(<SignupForm />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });
});
