import type * as React from 'react';
import { Permission } from './permissions.ts';

export interface Role {
    _id: string;
    name: string;
    permissions: Permission[];
    isEditable: boolean;
}

export interface User {
    _id: string;
    name: string;
    email: string;
    role: string; // Was Role enum, now a string to match Role.name
    dealerId?: string;
    password?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    avatarUrl?: string;
    resetToken?: string;
    resetTokenExpiry?: string;
    authId?: string;
}

export interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (email: string, password?: string) => Promise<User>;
    logout: () => void;
    updateCurrentUser: (updatedUser: User) => void;
}

export interface Dealer {
    _id: string;
    name: string;
    ownerName: string;
    phone: string;
    email: string;
    city: string;
    registrationApproved: boolean;
    reputationScore: number;
    createdAt: string;
}

export interface ProductVariant {
    _id: string;
    name: string; // e.g. NA-70cc
    color: string; // e.g. Red
    sku: string;
    price: number;
}

export interface PriceHistory {
    price: number;
    timestamp: string;
}

export interface Product {
    _id: string;
    brand: string;
    modelName: string;
    variants: ProductVariant[];
    specifications: {
        engine: string;
        mileage: string;
    };
    priceHistory?: PriceHistory[];
}

export enum StockStatus {
    Available = 'Available',
    Reserved = 'Reserved',
    Sold = 'Sold',
}

export interface StockItem {
    _id: string;
    vin: string;
    variantId: string;
    dealerId: string | null; // Can be null for central stock
    status: StockStatus;
    assignedAt: string;
}

export enum ActionType {
    Create = 'CREATE',
    Update = 'UPDATE',
    Delete = 'DELETE',
    Login = 'LOGIN',
    Approve = 'APPROVE',
    Dispatch = 'DISPATCH',
}

export interface AuditLog {
    _id: string;
    userId: string;
    userRole: string; // Changed from 'role: Role'
    action: ActionType;
    targetCollection?: string;
    targetId?: string;
    changes?: string;
    timestamp: string;
}

export interface Notification {
    _id: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    link?: { page: Page; state?: any };
}

export interface DeviceSession {
    _id: string;
    os: string;
    userAgent: string;
    ip: string;
    lastActive: string;
    isCurrent: boolean;
}

export enum BookingStatus {
    Pending = 'Pending',
    Allocated = 'Allocated',
    Delivered = 'Delivered',
    Cancelled = 'Cancelled',
}

export enum PaymentType {
    Cash = 'Cash',
    BankTransfer = 'Bank_Transfer',
    Card = 'Card',
}

export interface Payment {
    amount: number;
    type: PaymentType;
    timestamp: string;
}

export interface DealerPayment {
    _id: string;
    dealerId: string;
    stockOrderId?: string; // Optional: link payment to a specific order
    amount: number;
    type: PaymentType;
    reference?: string;
    timestamp: string;
    proofOfPayment?: string;
}

export interface Booking {
    _id: string;
    customerName: string;
    customerPhone: string;
    dealerId: string;
    variantId: string;
    stockItemId?: string;
    bookingTimestamp: string;
    status: BookingStatus;
    payments: Payment[];
}

export interface Announcement {
    _id: string;
    subject: string;
    message: string;
    timestamp: string;
    sentByUserId: string;
}

export interface AnnouncementRecipient {
    _id: string;
    announcementId: string;
    userId: string;
    isRead: boolean;
}

export interface Conversation {
    _id: string;
    participantIds: string[];
    lastMessageTimestamp: string;
}

export interface Message {
    _id: string;
    conversationId: string;
    senderId: string;
    content: string;
    timestamp: string;
    isRead: boolean;
}


export type Page = 'Dashboard' | 'Dealers' | 'Products' | 'CompanyStock' | 'DealerStock' | 'Bookings' | 'Stock Orders' | 'Reports' | 'Audit Logs' | 'Settings' | 'DealerDetail' | 'Users' | 'Profile' | 'Approvals' | 'Announcements' | 'Messages' | 'Commission' | 'Finance';

export type DealerPage = 'Dashboard' | 'My Orders' | 'My Stock' | 'My Bookings' | 'My Backups' | 'Profile' | 'Announcements' | 'Messages';

export interface SyncQueueItem {
    type: 'ADD_STOCK_ORDER' | 'ADD_BOOKING' | 'UPDATE_BOOKING' | 'ADD_PAYMENT';
    payload: any;
    timestamp: number;
}


export interface StockOrderItem {
    productId: string;
    variantId: string;
    quantity: number;
}

export enum OrderStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    PartiallyApproved = 'Partially Approved',
    Rejected = 'Rejected',
    Dispatched = 'Dispatched',
    InTransit = 'In-Transit',
    Delivered = 'Delivered',
}

export interface ApprovedOrderItem extends StockOrderItem {
    approvedQuantity: number;
}

export interface StockOrder {
    _id: string;
    dealerId: string;
    requestTimestamp: string;
    status: OrderStatus;
    items: StockOrderItem[];
    approvedItems?: ApprovedOrderItem[];
    allocatedStockIds?: string[];
    trackingNumber?: string;
}

export type RecommendationType = 'Approve' | 'Reject' | 'Review';

export interface Recommendation {
    type: RecommendationType;
    reason: string;
    mlQuantity?: number;
    mlReasoningFactors?: string[];
}

export interface BackupRecord {
    _id: string;
    timestamp: string;
    fileName: string;
}

export interface Settings {
    theme: 'light' | 'dark';
    notifications: {
        newOrder: boolean;
        orderApproved: boolean;
        orderRejected: boolean;
        lowStockWarning: boolean;
    };
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';

export interface AppContextType {
    users: User[];
    roles: Role[];
    auditLogs: AuditLog[];
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
    deviceSessions: DeviceSession[];
    backupHistory: BackupRecord[];
    settings: Settings;
    isOnline: boolean;
    syncStatus: SyncStatus;
    syncQueue: SyncQueueItem[];
    autoApprovalEnabled: boolean;
    markNotificationAsRead: (notificationId: string) => void;
    removeDeviceSession: (sessionId: string) => void;
    setIsOnline: (isOnline: boolean) => void;
    processQueue: (dataActions: any) => Promise<void>;
    addToQueue: (item: SyncQueueItem) => void;
    toggleAutoApproval: () => void;
    backupState: (dataState: any) => void;
    restoreState: (newState: any, dataActions: any) => void;
    updateSettings: (newSettings: Partial<Settings>) => void;
    logAction: (action: ActionType, targetCollection?: string, targetId?: string, changes?: string, actor?: User) => void;
    addUser: (userData: Omit<User, '_id'>) => Promise<User>;
    updateUser: (updatedUser: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    addRole: (roleData: Omit<Role, '_id'>) => Promise<Role>;
    updateRole: (updatedRole: Role) => Promise<void>;
    deleteRole: (roleId: string) => Promise<void>;
}


export interface DataContextType {
    isLoading: boolean;
    dealers: Dealer[];
    products: Product[];
    stock: StockItem[];
    stockOrders: StockOrder[];
    bookings: Booking[];
    dealerPayments: DealerPayment[];
    announcements: Announcement[];
    announcementRecipients: AnnouncementRecipient[];
    conversations: Conversation[];
    messages: Message[];
    addDealer: (dealerData: Omit<Dealer, '_id' | 'createdAt' | 'registrationApproved'>) => Promise<void>;
    updateDealer: (updatedDealer: Dealer) => Promise<void>;
    approveDealer: (dealerId: string) => Promise<void>;
    revokeDealer: (dealerId: string) => Promise<void>;
    updateDealerStatusBulk: (dealerIds: string[], approved: boolean) => Promise<void>;
    recalculateReputation: (dealerId: string) => Promise<void>;
    registerDealer: (dealerData: Omit<Dealer, '_id' | 'createdAt' | 'registrationApproved' | 'reputationScore'>) => Promise<Dealer>;
    addProduct: (productData: Omit<Product, '_id' | 'priceHistory'>) => Promise<void>;
    updateProduct: (updatedProduct: Product) => Promise<void>;
    addOrUpdateProductsBulk: (productsToImport: Omit<Product, '_id' | 'priceHistory'>[]) => Promise<{ created: number; updated: number; }>;
    addStock: (stockData: Omit<StockItem, '_id' | 'assignedAt'>) => Promise<void>;
    updateStockStatusBulk: (stockIds: string[], status: StockStatus) => Promise<void>;
    processAllocationRequest: (orderId: string, approvedItems: ApprovedOrderItem[], status: OrderStatus) => Promise<void>;
    dispatchStockOrder: (orderId: string, trackingNumber?: string) => Promise<void>;
    confirmOrderReceipt: (orderId: string) => Promise<void>;
    createStockOrder: (orderData: Omit<StockOrder, '_id' | 'requestTimestamp' | 'status' | 'approvedItems'>) => Promise<void>;
    addBooking: (bookingData: Omit<Booking, '_id' | 'bookingTimestamp' | 'payments' | 'stockItemId'>) => Promise<void>;
    updateBooking: (updatedBooking: Booking) => Promise<void>;
    cancelBooking: (bookingId: string) => Promise<void>;
    addPayment: (bookingId: string, payment: Payment) => Promise<void>;
    addDealerPayment: (paymentData: Omit<DealerPayment, '_id' | 'timestamp'>) => Promise<void>;
    allocateStockToBooking: (bookingId: string, stockItemId: string) => Promise<void>;
    addAnnouncement: (subject: string, message: string) => Promise<void>;
    markAnnouncementAsRead: (announcementId: string) => Promise<void>;
    sendMessage: (recipientId: string, content: string) => Promise<void>;
    markConversationAsRead: (conversationId: string) => Promise<void>;
    getRecommendationForItem: (item: StockOrderItem, dealerId: string) => Recommendation;
    restoreDataState: (newState: any) => void;
}