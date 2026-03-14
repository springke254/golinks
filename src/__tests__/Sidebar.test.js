import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Sidebar from '../components/layout/Sidebar';

// Mock the auth hook
const mockLogout = jest.fn();
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

jest.mock('../components/workspace/WorkspaceSwitcher', () => () => <div>WorkspaceSwitcher</div>);

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('Sidebar', () => {
  beforeEach(() => {
    mockLogout.mockReset();
    localStorage.clear();
  });

  it('renders navigation items', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('highlights active route', () => {
    renderWithRouter(<Sidebar />, { route: '/settings' });
    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink.className).toContain('bg-primary');
  });

  it('calls logout when sign out button is clicked', () => {
    renderWithRouter(<Sidebar />);
    fireEvent.click(screen.getByText('Sign out'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('persists collapsed state in localStorage', () => {
    renderWithRouter(<Sidebar />);
    const collapseBtn = screen.getByLabelText(/collapse sidebar/i);
    fireEvent.click(collapseBtn);
    expect(localStorage.getItem('sidebar_collapsed')).toBe('true');
  });
});
