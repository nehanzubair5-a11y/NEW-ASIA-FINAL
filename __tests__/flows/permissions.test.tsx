import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils.tsx';
import App from '../../App.tsx';
import { describe, it, expect } from 'vitest';

describe('Permissions & Role-Based Access Control (RBAC) Flow', () => {

  it('Admin has full access to administrative pages and actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Log in as Admin
    await user.selectOptions(screen.getByLabelText(/login as/i), 'Admin');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
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
    const user = userEvent.setup();
    render(<App />);
    
    // 1. Log in as Dealer
    await user.selectOptions(screen.getByLabelText(/login as/i), 'Dealer');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
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
    expect(await screen.findByRole('heading', { name: /my bookings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new booking/i })).toBeInTheDocument();
  });

  it('Finance / Auditor has limited access and specific action permissions', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Log in as Finance / Auditor
    await user.selectOptions(screen.getByLabelText(/login as/i), 'Finance / Auditor');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
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
    
    const firstBookingRow = await screen.findByText('Ali Raza'); // Find the row for the first booking
    const row = firstBookingRow.closest('tr');
    if (!row) throw new Error('Could not find table row for booking');
    
    expect(within(row).getByRole('button', { name: /view invoice/i })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /edit booking/i })).not.toBeInTheDocument();
  });

  it('Logistics staff can see stock pages and dispatch approved orders', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Log in as Logistics
    await user.selectOptions(screen.getByLabelText(/login as/i), 'Logistics');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
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

    // 5. Find an approved order and verify "Dispatch" button is visible
    const approvedOrderRow = await screen.findByText('United Autos LHR'); // Belongs to an approved order in mock data
    const row = approvedOrderRow.closest('tr');
    if (!row) throw new Error('Could not find table row for approved order');
    
    expect(within(row).getByRole('button', { name: /dispatch/i })).toBeInTheDocument();

    // 6. Find a pending order and verify "Dispatch" button is NOT visible
    const pendingOrderRow = await screen.findByText('Pindi Riders'); // Belongs to a pending order
    const pRow = pendingOrderRow.closest('tr');
    if (!pRow) throw new Error('Could not find table row for pending order');

    expect(within(pRow).queryByRole('button', { name: /dispatch/i })).not.toBeInTheDocument();
  });
});
