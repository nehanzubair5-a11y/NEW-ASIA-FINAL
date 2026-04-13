import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils.tsx';
import App from '../../App.tsx';
import { describe, it, expect, vi } from 'vitest';

// Mock the auth context to simulate a successful login
vi.mock('../../hooks/useAuth.ts', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn().mockResolvedValue({ _id: '1', name: 'Admin', role: 'Super Admin', email: 'admin@system.com' }),
    logout: vi.fn(),
  })
}));

// Mock the data context to avoid fetching real data during tests
vi.mock('../../hooks/useData.ts', () => ({
  useData: () => ({
    dealers: [],
    isLoading: false,
  })
}));

describe('Authentication Flow', () => {
  it('renders the login page correctly', async () => {
    render(<App />);

    // App should initially render the LoginPage
    expect(screen.getByRole('heading', { name: /dealer portal login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
