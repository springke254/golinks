import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import CreateLinkModal from '../components/links/CreateLinkModal';

// Mock hooks
const mockMutate = jest.fn();
jest.mock('../hooks/useLinks', () => ({
  useCreateLink: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useCheckSlug: () => ({
    data: null,
    isLoading: false,
  }),
  useUserTags: () => ({
    data: [],
  }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderModal(props = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateLinkModal open={true} onClose={jest.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('CreateLinkModal', () => {
  beforeEach(() => {
    mockMutate.mockReset();
  });

  it('renders the modal title', () => {
    renderModal();
    expect(screen.getByText('Create New Link')).toBeInTheDocument();
  });

  it('renders destination URL input', () => {
    renderModal();
    expect(screen.getByPlaceholderText(/https:\/\/example.com/)).toBeInTheDocument();
  });

  it('renders custom slug input with go/ prefix', () => {
    renderModal();
    expect(screen.getByText('go/')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('my-link')).toBeInTheDocument();
  });

  it('renders title input', () => {
    renderModal();
    expect(screen.getByPlaceholderText('My awesome link')).toBeInTheDocument();
  });

  it('renders tags input', () => {
    renderModal();
    expect(screen.getByText('Tags (optional)')).toBeInTheDocument();
  });

  it('renders advanced options toggle', () => {
    renderModal();
    expect(screen.getByText('Advanced Options')).toBeInTheDocument();
  });

  it('shows advanced options when toggled', () => {
    renderModal();
    fireEvent.click(screen.getByText('Advanced Options'));
    expect(screen.getByText('Password Protection')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('One-Time')).toBeInTheDocument();
    expect(screen.getByText('Expires At')).toBeInTheDocument();
    expect(screen.getByText('Max Clicks')).toBeInTheDocument();
  });

  it('renders create and cancel buttons', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /create link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CreateLinkModal open={false} onClose={jest.fn()} />
      </QueryClientProvider>
    );
    expect(screen.queryByText('Create New Link')).not.toBeInTheDocument();
  });
});
