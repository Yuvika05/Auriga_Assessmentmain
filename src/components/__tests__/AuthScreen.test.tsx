import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthScreen } from '../AuthScreen';

// Mock the useAppStore hook
const mockLoginGuest = vi.fn();
const mockLogin = vi.fn();
const mockSignup = vi.fn();

vi.mock('../../store/useAppStore', () => ({
  useAppStore: () => ({
    login: mockLogin,
    signup: mockSignup,
    loginGuest: mockLoginGuest,
    errorMessage: null,
    clearError: vi.fn(),
  }),
}));

describe('AuthScreen Component', () => {
  it('renders login form elements and allows switching to signup mode', () => {
    render(<AuthScreen />);

    // Check title and inputs
    expect(screen.getByText('SplitPool')).toBeDefined();
    expect(screen.getByPlaceholderText('organizer@company.com')).toBeDefined();
    expect(screen.getByPlaceholderText('At least 6 characters')).toBeDefined();

    // Switch to signup
    const signUpTab = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signUpTab);

    // Should now show name input for signup
    expect(screen.getByPlaceholderText('e.g. Priya Sharma')).toBeDefined();
  });

  it('triggers loginGuest when the Instant Demo guest button is clicked', () => {
    render(<AuthScreen />);

    const guestBtn = screen.getByText(/Continue as Guest/i);
    expect(guestBtn).toBeDefined();

    fireEvent.click(guestBtn);
    expect(mockLoginGuest).toHaveBeenCalledTimes(1);
  });
});
