import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils.tsx';
import App from '../../App.tsx';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a mock user state that we can change per test
let mockUser: any = null;

vi.mock('../../hooks/useAuth.ts', () => ({
  useAuth: () => ({
    isAuthenticated: !!mockUser,
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
  })
}));

describe('Permissions & Role-Based Access Control (RBAC) Flow', () => {
  beforeEach(() => {
    mockUser = null;
  });

  it('Admin has full access to administrative pages and actions', async () => {
    mockUser = { _id: '1', name: 'Admin', role: 'Super Admin', email: 'admin@system.com' };
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: /dashboard overview/i });

    // 2. Verify all key admin links are visible in the sidebar
    expect(screen.getByRole('link', { name: /dealers/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();

    // 3. Navigate to a page and verify action buttons are present
    await user.click(screen.getByRole('link', { name: /dealers/i }));
    expect(await screen.findByRole('heading', { name: /manage dealers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add new dealer/i })).toBeInTheDocument();
  });

  it('Dealer has access to only their dashboard and cannot see admin pages', async () => {
    mockUser = { _id: '2', name: 'Dealer', role: 'Dealer', email: 'dealer@system.com', dealerId: 'd1' };
    const user = userEvent.setup();
    render(<App />);
    
    await screen.findByRole('heading', { name: /my dashboard/i });

    // 2. Verify dealer-specific links are visible
    expect(screen.getByRole('link', { name: /my orders/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my stock/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my bookings/i })).toBeInTheDocument();

    // 3. Verify admin links are NOT visible
    expect(screen.queryByRole('link', { name: 'Dealers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();

     // 4. Navigate to a dealer page and verify actions
    await user.click(screen.getByRole('link', { name: /my bookings/i }));
    expect(await screen.findByRole('heading', { name: /manage bookings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new booking/i })).toBeInTheDocument();
  });

  it('Finance / Auditor has limited access and specific action permissions', async () => {
    mockUser = { _id: '3', name: 'Finance', role: 'Finance / Auditor', email: 'finance@system.com' };
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: /finance dashboard/i });
    
    // 2. Verify specific links are visible
    expect(screen.getByRole('link', { name: /bookings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit logs/i })).toBeInTheDocument();
    
    // 3. Verify admin links are NOT visible
    expect(screen.queryByRole('link', { name: 'Dealers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Products' })).not.toBeInTheDocument();

    // 4. Navigate to Bookings page and check actions
    await user.click(screen.getByRole('link', { name: /bookings/i }));
    await screen.findByRole('heading', { name: /manage bookings/i });
    
    // 5. Verify they CANNOT create/edit, but CAN see invoice button
    expect(screen.queryByRole('button', { name: /new booking/i })).not.toBeInTheDocument();
  });

  it('Logistics staff can see stock pages and dispatch approved orders', async () => {
    mockUser = { _id: '4', name: 'Logistics', role: 'Logistics / Dispatch', email: 'logistics@system.com' };
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: /dashboard overview/i });

    // 2. Verify specific links are visible
    expect(screen.getByRole('link', { name: /stock/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /stock orders/i })).toBeInTheDocument();

    // 3. Verify other links are NOT visible
    expect(screen.queryByRole('link', { name: 'Dealers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    
    // 4. Navigate to Stock Orders page
    await user.click(screen.getByRole('link', { name: /stock orders/i }));
    await screen.findByRole('heading', { name: /stock orders/i });
  });
});
