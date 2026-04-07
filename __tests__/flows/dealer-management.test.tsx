import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils.tsx'; // Our custom render
import App from '../../App.tsx';
import { describe, it, expect } from 'vitest';

describe('Dealer Management Flow', () => {
  it('allows an Admin to add a new dealer', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Log in as Admin
    await user.selectOptions(screen.getByLabelText(/login as/i), 'Admin');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await screen.findByRole('heading', { name: /dashboard overview/i });

    // 2. Navigate to Dealers page
    await user.click(screen.getByRole('link', { name: /dealers/i }));
    expect(await screen.findByRole('heading', { name: /manage dealers/i })).toBeInTheDocument();
    
    // 3. Open the "Add New Dealer" modal
    await user.click(screen.getByRole('button', { name: /add new dealer/i }));
    expect(await screen.findByRole('heading', { name: /add new dealer/i })).toBeInTheDocument();

    // 4. Fill out the form
    const newDealerName = `Test Dealer ${Date.now()}`;
    await user.type(screen.getByLabelText(/dealer name/i), newDealerName);
    await user.type(screen.getByLabelText(/owner name/i), 'Test Owner');
    await user.type(screen.getByLabelText(/email/i), 'test@dealer.com');
    await user.type(screen.getByLabelText(/phone/i), '03001234567');
    await user.type(screen.getByLabelText(/city/i), 'Test City');
    
    // 5. Submit the form
    await user.click(screen.getByRole('button', { name: /save dealer/i }));
    
    // 6. Verify the modal is closed and the new dealer is in the table
    // The modal heading should disappear
    expect(screen.queryByRole('heading', { name: /add new dealer/i })).not.toBeInTheDocument();
    
    // The new dealer name should be visible in the document (in the table)
    expect(await screen.findByText(newDealerName)).toBeInTheDocument();
    
    // Also check for the toast message
    expect(await screen.findByText('New dealer created!')).toBeInTheDocument();
  });
});
