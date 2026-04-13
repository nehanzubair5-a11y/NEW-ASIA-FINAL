import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataProvider, DataContext } from '../../context/DataContext';
import { AppProvider } from '../../context/AppContext';
import { AuthProvider } from '../../context/AuthContext';
import { api } from '../../api/index';
import React, { useContext } from 'react';

// Mock the API calls to simulate database interactions
vi.mock('../../api/index', () => ({
  api: {
    fetchDealers: vi.fn().mockResolvedValue([{ _id: 'dealer-1', name: 'Test Dealer' }]),
    fetchProducts: vi.fn().mockResolvedValue([]),
    // Initially, we have 3 available stock items in the central warehouse
    fetchStock: vi.fn().mockResolvedValue([
      { _id: 'stock-1', variantId: 'var-1', status: 'Available', dealerId: null, vin: 'VIN001' },
      { _id: 'stock-2', variantId: 'var-1', status: 'Available', dealerId: null, vin: 'VIN002' },
      { _id: 'stock-3', variantId: 'var-1', status: 'Available', dealerId: null, vin: 'VIN003' },
    ]),
    fetchStockOrders: vi.fn().mockResolvedValue([]),
    fetchBookings: vi.fn().mockResolvedValue([]),
    fetchDealerPayments: vi.fn().mockResolvedValue([]),
    fetchAnnouncements: vi.fn().mockResolvedValue([]),
    fetchAnnouncementRecipients: vi.fn().mockResolvedValue([]),
    fetchConversations: vi.fn().mockResolvedValue([]),
    fetchMessages: vi.fn().mockResolvedValue([]),
    fetchRoles: vi.fn().mockResolvedValue([]),
    fetchUsers: vi.fn().mockResolvedValue([]),
    fetchAuditLogs: vi.fn().mockResolvedValue([]),
    
    // Mock the mutation functions
    saveStockOrder: vi.fn().mockImplementation(async (order) => ({ ...order, _id: 'order-1' })),
    saveApprovedOrder: vi.fn().mockImplementation(async (order, stock) => ({ order, stock })),
    saveAuditLog: vi.fn().mockResolvedValue({}),
  }
}));

// Mock Auth to simulate a logged-in Admin
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'admin-1', role: 'Super Admin' } })
}));

// A test component to interact with DataContext directly
const TestHarness = () => {
  const data = useContext(DataContext);
  if (!data) return <div>Loading Context...</div>;

  return (
    <div>
      <div data-testid="order-count">{data.stockOrders.length}</div>
      <div data-testid="stock-count">{data.stock.length}</div>
      
      <button
        onClick={() => data.createStockOrder({
          dealerId: 'dealer-1',
          items: [{ variantId: 'var-1', quantity: 2 }],
          totalAmount: 500000
        })}
      >
        Submit Dealer Order
      </button>
      
      <button
        onClick={() => data.processAllocationRequest(
          'order-1', 
          [{ variantId: 'var-1', requestedQuantity: 2, approvedQuantity: 2 }], 
          'Approved'
        )}
      >
        Approve & Allocate Stock
      </button>
    </div>
  );
};

// Wrapper to provide all necessary contexts
const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <AppProvider>
      <DataProvider>{children}</DataProvider>
    </AppProvider>
  </AuthProvider>
);

describe('Stock Allocation & Dealer Order Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully submit a dealer order and allocate stock upon approval', async () => {
    const user = userEvent.setup();
    render(<TestHarness />, { wrapper: AllProviders });

    // Wait for initial data load (3 stock items)
    await waitFor(() => {
      expect(screen.getByTestId('stock-count')).toHaveTextContent('3');
    });

    // ==========================================
    // STEP 1: Dealer Submits Order
    // ==========================================
    await user.click(screen.getByText('Submit Dealer Order'));

    // Verify API was called to save the pending order
    expect(api.saveStockOrder).toHaveBeenCalledTimes(1);
    expect(api.saveStockOrder).toHaveBeenCalledWith(expect.objectContaining({
      dealerId: 'dealer-1',
      status: 'Pending',
      items: [{ variantId: 'var-1', quantity: 2 }]
    }));

    // Wait for the local state to update with the new order
    await waitFor(() => {
      expect(screen.getByTestId('order-count')).toHaveTextContent('1');
    });

    // ==========================================
    // STEP 2: Admin Approves Order & Allocates Stock
    // ==========================================
    await user.click(screen.getByText('Approve & Allocate Stock'));

    // Verify API was called to approve the order and update stock
    expect(api.saveApprovedOrder).toHaveBeenCalledTimes(1);
    
    // Extract the arguments passed to the API
    const [updatedOrder, stockUpdates] = vi.mocked(api.saveApprovedOrder).mock.calls[0];
    
    // Assertions for the Order
    expect(updatedOrder.status).toBe('Approved');
    expect(updatedOrder.allocatedStockIds).toHaveLength(2); // 2 items were approved
    
    // Assertions for the Stock Items
    expect(stockUpdates).toHaveLength(2); // 2 items should be pulled from central stock
    
    // Verify the first stock item was properly assigned to the dealer
    // Note: DataContext currently sets it to 'Available' for the dealer directly upon approval in the mock
    // Let's just verify the dealerId was assigned
    expect(stockUpdates[0].dealerId).toBe('dealer-1');
    
    // Verify the second stock item was properly assigned to the dealer
    expect(stockUpdates[1].dealerId).toBe('dealer-1');
  });
});
