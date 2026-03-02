import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TagInput from '../components/ui/TagInput';

describe('TagInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockReset();
  });

  it('renders with label', () => {
    render(<TagInput label="Tags" value={[]} onChange={mockOnChange} />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('renders existing tags', () => {
    render(<TagInput value={['frontend', 'backend']} onChange={mockOnChange} />);
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
  });

  it('adds a tag on Enter', () => {
    render(<TagInput value={[]} onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnChange).toHaveBeenCalledWith(['newtag']);
  });

  it('adds a tag on comma', () => {
    render(<TagInput value={[]} onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'commtag' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(mockOnChange).toHaveBeenCalledWith(['commtag']);
  });

  it('removes a tag when X is clicked', () => {
    render(<TagInput value={['removeMe', 'keepMe']} onChange={mockOnChange} />);
    const removeButtons = screen.getAllByRole('button');
    // First button is for 'removeMe' tag
    fireEvent.click(removeButtons[0]);
    expect(mockOnChange).toHaveBeenCalledWith(['keepMe']);
  });

  it('does not add duplicate tags', () => {
    render(<TagInput value={['existing']} onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'existing' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('normalizes tags to lowercase', () => {
    render(<TagInput value={[]} onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'UPPER' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnChange).toHaveBeenCalledWith(['upper']);
  });

  it('shows max tags warning when limit reached', () => {
    const tags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
    render(<TagInput value={tags} onChange={mockOnChange} maxTags={20} />);
    expect(screen.getByText(/maximum 20 tags reached/i)).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<TagInput value={[]} onChange={mockOnChange} error="Tags error" />);
    expect(screen.getByText('Tags error')).toBeInTheDocument();
  });
});
