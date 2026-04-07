import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils.tsx'; // Our custom render
import App from '../../App.tsx';
import { describe, it, expect } from 'vitest';

describe('Authentication Flow', () => {
  it('allows a user to log in as an Admin and view the dashboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    // App should initially render the LoginPage
    expect(screen.getByRole('heading', { name: /dealer portal login/i })).toBeInTheDocument();

    // Fill out the form
    await user.selectOptions(screen.getByLabelText(/login as/i), 'Admin');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // After login, the main dashboard should be visible
    // We'll check for a title unique to the admin dashboard
    expect(await screen.findByRole('heading', { name: /dashboard overview/i })).toBeInTheDocument();

    // Check for a stat card to be sure
    expect(screen.getByText(/total dealers/i)).toBeInTheDocument();
  });
});
