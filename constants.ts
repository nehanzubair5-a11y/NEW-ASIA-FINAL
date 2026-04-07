import {
  User, Dealer, Product, StockStatus, StockItem,
  ActionType, AuditLog,
  Notification, DeviceSession, StockOrder, OrderStatus,
  Booking, BookingStatus, PaymentType, DealerPayment, Announcement, AnnouncementRecipient,
  Conversation, Message, Role
} from './types.ts';
import { ALL_PERMISSIONS } from './permissions.ts';

export const MOCK_ROLES: Role[] = [
  { _id: 'role-super', name: 'Super Admin', permissions: ALL_PERMISSIONS, isEditable: false },
  { _id: 'role-admin', name: 'Admin', permissions: ALL_PERMISSIONS.filter(p => p !== 'system:manage_settings'), isEditable: true },
  { _id: 'role-dealer', name: 'Dealer', permissions: ['dealer_self:manage_bookings', 'dealer_self:create_order', 'dealer_self:confirm_receipt'], isEditable: false },
  { _id: 'role-pm', name: 'Product Manager', permissions: ['product:update_core', 'product:manage_variants'], isEditable: true },
  { _id: 'role-bm', name: 'Booking Manager', permissions: ['booking:create', 'booking:update'], isEditable: true },
  { _id: 'role-sc', name: 'Stock Controller', permissions: ['order:approve'], isEditable: true },
  { _id: 'role-auditor', name: 'Finance / Auditor', permissions: ['booking:view_invoice', 'system:view_reports', 'system:view_audit_logs', 'system:view_commission_reports', 'system:view_finance_ledger'], isEditable: true },
  { _id: 'role-logistics', name: 'Logistics', permissions: ['order:dispatch'], isEditable: true },
];

// MOCK DATA - Roles are now strings
export const MOCK_USERS: User[] = [
  { _id: 'user-1', name: 'Super Admin', email: 'super@system.com', role: 'Super Admin', phone: '0300-0000001', whatsapp: '0300-0000001', address: '123 Admin Lane, HQ City' },
  { _id: 'user-2', name: 'Admin User', email: 'admin@system.com', role: 'Admin', phone: '0300-0000002', whatsapp: '0300-0000002', address: '456 System St, HQ City' },
  { _id: 'user-3', name: 'Rizwan Ahmed', email: 'rizwan@carworld.com', role: 'Dealer', dealerId: 'dealer-1', phone: '0300-1234567', whatsapp: '0300-1234567', address: '789 Dealer Ave, Karachi' },
  { _id: 'user-4', name: 'Finance Auditor', email: 'auditor@system.com', role: 'Finance / Auditor', phone: '0300-0000004', address: '101 Finance Blvd, HQ City' },
  { _id: 'user-5', name: 'Product Manager', email: 'product@system.com', role: 'Product Manager' },
  { _id: 'user-6', name: 'Booking Manager', email: 'booking@system.com', role: 'Booking Manager' },
  { _id: 'user-7', name: 'Stock Controller', email: 'stock@system.com', role: 'Stock Controller' },
  { _id: 'user-8', name: 'Logistics Staff', email: 'logistics@system.com', role: 'Logistics' },
];

export const MOCK_DEALERS: Dealer[] = [
  { _id: 'dealer-1', name: 'New Asia Motors KHI', ownerName: 'Rizwan Ahmed', phone: '0300-1234567', email: 'rizwan@namotor.com', city: 'Karachi', registrationApproved: true, reputationScore: 9.2, createdAt: new Date().toISOString() },
  { _id: 'dealer-2', name: 'United Autos LHR', ownerName: 'Sana Javed', phone: '0321-7654321', email: 'sana@united.com', city: 'Lahore', registrationApproved: true, reputationScore: 8.5, createdAt: new Date().toISOString() },
  { _id: 'dealer-3', name: 'Pindi Riders', ownerName: 'Ali Khan', phone: '0333-1122334', email: 'ali.k@pindiriders.com', city: 'Rawalpindi', registrationApproved: true, reputationScore: 4.8, createdAt: new Date().toISOString() },
  { _id: 'dealer-4', name: 'Capital Wheels ISB', ownerName: 'Zainab Chaudry', phone: '0345-5556677', email: 'zainab.c@capwheels.com', city: 'Islamabad', registrationApproved: false, reputationScore: 6.1, createdAt: new Date().toISOString() },
];

export const MOCK_PRODUCTS: Product[] = [
    { 
        _id: 'prod-bike', 
        brand: 'New Asia', 
        modelName: 'Bike', 
        variants: [
            { _id: 'v-bike-70', name: 'NA-70cc', color: 'Red', sku: 'NA-B70-R', price: 110000 },
            { _id: 'v-bike-70b', name: 'NA-70cc', color: 'Black', sku: 'NA-B70-B', price: 110000 },
            { _id: 'v-bike-125', name: 'NA-125cc', color: 'Red', sku: 'NA-B125-R', price: 185000 },
        ],
        specifications: { engine: '70cc / 125cc', mileage: '55 km/l' },
        priceHistory: []
    },
    { 
        _id: 'prod-scooty', 
        brand: 'Ramza', 
        modelName: 'Scooty', 
        variants: [
            { _id: 'v-scooty-std', name: 'Standard', color: 'Pink', sku: 'RMZ-S-P', price: 155000 },
            { _id: 'v-scooty-spc', name: 'Special', color: 'Mint', sku: 'RMZ-SPC-M', price: 165000 }
        ],
        specifications: { engine: '100cc', mileage: '45 km/l' },
        priceHistory: []
    },
    { 
        _id: 'prod-loader', 
        brand: 'New Asia', 
        modelName: 'Loader Rikshaw', 
        variants: [
            { _id: 'v-ldr-150', name: '150cc', color: 'Blue', sku: 'NA-LDR-150', price: 380000 },
            { _id: 'v-ldr-200', name: '200cc', color: 'Orange', sku: 'NA-LDR-200', price: 420000 }
        ],
        specifications: { engine: '150cc / 200cc', mileage: '30 km/l' },
        priceHistory: []
    },
    {
        _id: 'prod-auto', 
        brand: 'New Asia', 
        modelName: 'Auto Rikshaw', 
        variants: [
            { _id: 'v-auto-std', name: 'Standard', color: 'Green', sku: 'NA-AUTO-G', price: 450000 }
        ],
        specifications: { engine: '200cc', mileage: '35 km/l' },
        priceHistory: []
    },
    {
        _id: 'prod-car', 
        brand: 'BAW', 
        modelName: 'Car', 
        variants: [
            { _id: 'v-car-pilot', name: 'Pilot Mini Van', color: 'White', sku: 'BAW-PLT-W', price: 1800000 }
        ],
        specifications: { engine: '1000cc', mileage: '15 km/l' },
        priceHistory: []
    },
];

export const MOCK_STOCK: StockItem[] = [
    // Central Stock
    ...Array.from({ length: 10 }, (_, i) => ({ _id: `cs-bike70r-${i}`, vin: `VINCB70R${i}`, variantId: 'v-bike-70', dealerId: null, status: StockStatus.Available, assignedAt: new Date().toISOString() })),
    ...Array.from({ length: 10 }, (_, i) => ({ _id: `cs-bike70b-${i}`, vin: `VINCB70B${i}`, variantId: 'v-bike-70b', dealerId: null, status: StockStatus.Available, assignedAt: new Date().toISOString() })),
    ...Array.from({ length: 5 }, (_, i) => ({ _id: `cs-bike125-${i}`, vin: `VINC125${i}`, variantId: 'v-bike-125', dealerId: null, status: StockStatus.Available, assignedAt: new Date().toISOString() })),
    ...Array.from({ length: 10 }, (_, i) => ({ _id: `cs-scooty-${i}`, vin: `VINCSCOOT${i}`, variantId: 'v-scooty-std', dealerId: null, status: StockStatus.Available, assignedAt: new Date().toISOString() })),
    ...Array.from({ length: 15 }, (_, i) => ({ _id: `cs-loader-${i}`, vin: `VINCLDR${i}`, variantId: 'v-ldr-150', dealerId: null, status: StockStatus.Available, assignedAt: new Date().toISOString() })),
    ...Array.from({ length: 5 }, (_, i) => ({ _id: `cs-auto-${i}`, vin: `VINCAUTO${i}`, variantId: 'v-auto-std', dealerId: null, status: StockStatus.Available, assignedAt: new Date().toISOString() })),
    // Dealer Stock
    { _id: 'stock-1', vin: 'VIN12345ABC', variantId: 'v-bike-125', dealerId: 'dealer-1', status: StockStatus.Available, assignedAt: new Date().toISOString() },
    { _id: 'stock-2', vin: 'VIN67890DEF', variantId: 'v-auto-std', dealerId: 'dealer-1', status: StockStatus.Reserved, assignedAt: new Date().toISOString() },
    { _id: 'stock-3', vin: 'VINGHI123JK', variantId: 'v-ldr-200', dealerId: 'dealer-2', status: StockStatus.Sold, assignedAt: new Date().toISOString() },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
    { _id: 'log-1', userId: 'user-1', userRole: 'Super Admin', action: ActionType.Login, changes: 'User logged in', timestamp: new Date().toISOString() },
    { _id: 'log-2', userId: 'user-2', userRole: 'Admin', action: ActionType.Update, targetCollection: 'Products', targetId: 'prod-bike', changes: 'Updated price for NA-70cc', timestamp: new Date().toISOString() },
    { _id: 'log-3', userId: 'user-3', userRole: 'Dealer', action: ActionType.Create, targetCollection: 'StockOrders', targetId: 'alloc-rwp', timestamp: new Date().toISOString() },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
    { _id: 'notif-1', message: 'New stock of NA-125cc Bikes has arrived.', timestamp: new Date().toISOString(), isRead: false },
    { _id: 'notif-2', message: 'Stock Order #alloc-lhr has been approved.', timestamp: new Date().toISOString(), isRead: false },
    { _id: 'notif-3', message: 'System maintenance scheduled for tonight.', timestamp: new Date().toISOString(), isRead: true },
];

export const MOCK_DEVICE_SESSIONS: DeviceSession[] = [
    { _id: 'session-1', os: 'Windows 10', userAgent: 'Chrome/124.0', ip: '192.168.1.1', lastActive: new Date().toISOString(), isCurrent: true },
    { _id: 'session-2', os: 'macOS Sonoma', userAgent: 'Safari/17.0', ip: '203.0.113.25', lastActive: '2024-05-10T12:00:00Z', isCurrent: false },
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    _id: 'booking-1',
    customerName: 'Ali Raza',
    customerPhone: '0311-1234567',
    dealerId: 'dealer-1',
    variantId: 'v-bike-125',
    bookingTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: BookingStatus.Delivered,
    payments: [{ amount: 185000, type: PaymentType.Cash, timestamp: new Date().toISOString() }],
  },
  {
    _id: 'booking-2',
    customerName: 'Fatima Khan',
    customerPhone: '0322-9876543',
    dealerId: 'dealer-2',
    variantId: 'v-scooty-spc',
    bookingTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: BookingStatus.Allocated,
    payments: [{ amount: 50000, type: PaymentType.BankTransfer, timestamp: new Date().toISOString() }],
  },
  {
    _id: 'booking-3',
    customerName: 'Zainab Ali',
    customerPhone: '0333-1122334',
    dealerId: 'dealer-1',
    variantId: 'v-auto-std',
    bookingTimestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: BookingStatus.Pending,
    payments: [],
  }
];

export const MOCK_STOCK_ORDERS: StockOrder[] = [
    // Rawalpindi dealer from example
    {
        _id: 'alloc-rwp',
        dealerId: 'dealer-3', // Pindi Riders (Low score)
        requestTimestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: OrderStatus.Pending,
        items: [
            { productId: 'prod-bike', variantId: 'v-bike-70b', quantity: 2 },
            { productId: 'prod-loader', variantId: 'v-ldr-150', quantity: 1 },
            { productId: 'prod-auto', variantId: 'v-auto-std', quantity: 3 },
        ]
    },
    {
        _id: 'alloc-khi',
        dealerId: 'dealer-1', // Karachi dealer (High score)
        requestTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: OrderStatus.Pending,
        items: [
            { productId: 'prod-bike', variantId: 'v-bike-125', quantity: 10 },
            { productId: 'prod-scooty', variantId: 'v-scooty-spc', quantity: 5 },
        ]
    },
    {
        _id: 'alloc-lhr',
        dealerId: 'dealer-2', // Lahore dealer
        requestTimestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: OrderStatus.Pending,
        items: [
            { productId: 'prod-car', variantId: 'v-car-pilot', quantity: 2 }, // Low/No stock
        ]
    },
    {
        _id: 'alloc-4',
        dealerId: 'dealer-2',
        requestTimestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        status: OrderStatus.Approved,
        items: [ { productId: 'prod-bike', variantId: 'v-bike-70', quantity: 5 } ],
        approvedItems: [ { productId: 'prod-bike', variantId: 'v-bike-70', quantity: 5, approvedQuantity: 5 } ],
        allocatedStockIds: ['cs-bike70r-0', 'cs-bike70r-1', 'cs-bike70r-2', 'cs-bike70r-3', 'cs-bike70r-4'],
    }
];

export const MOCK_DEALER_PAYMENTS: DealerPayment[] = [
    {
        _id: 'dp-1',
        dealerId: 'dealer-2',
        amount: 500000,
        type: PaymentType.BankTransfer,
        reference: 'INV-2024-001',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
    {
        _id: 'anno-1',
        subject: 'Eid Holiday Schedule',
        message: 'Dear Dealers, please note that the head office will be closed from June 17th to June 19th for Eid-ul-Adha. All stock dispatches will resume on June 20th. Eid Mubarak!',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        sentByUserId: 'user-1',
    },
    {
        _id: 'anno-2',
        subject: 'New Product Launch: NA-150cc Bike',
        message: 'We are excited to announce the upcoming launch of the New Asia 150cc bike. More details on pricing and availability will be shared next week. Prepare your showrooms!',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        sentByUserId: 'user-2',
    }
];

export const MOCK_ANNOUNCEMENT_RECIPIENTS: AnnouncementRecipient[] = [
    // user-3 (dealer) has read the first announcement but not the second
    { _id: 'rec-1', announcementId: 'anno-1', userId: 'user-3', isRead: true },
    { _id: 'rec-2', announcementId: 'anno-2', userId: 'user-3', isRead: false },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
    {
        _id: 'convo-1',
        participantIds: ['user-2', 'user-3'], // Admin User and Rizwan Ahmed (Dealer)
        lastMessageTimestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    }
];

export const MOCK_MESSAGES: Message[] = [
    {
        _id: 'msg-1',
        conversationId: 'convo-1',
        senderId: 'user-3',
        content: 'Hi, I have a question about my last stock order #alloc-khi.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: true,
    },
    {
        _id: 'msg-2',
        conversationId: 'convo-1',
        senderId: 'user-2',
        content: 'Hello Rizwan, what can I help you with?',
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        isRead: true,
    },
    {
        _id: 'msg-3',
        conversationId: 'convo-1',
        senderId: 'user-3',
        content: 'The approval seems to be pending for longer than usual. Can you check on the status?',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        isRead: false, // This is the unread message for the admin
    },
];
