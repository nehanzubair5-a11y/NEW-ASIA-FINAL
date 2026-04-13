import { Dealer, Product, StockItem, StockOrder, Booking, StockStatus, User, OrderStatus, Role, DealerPayment, Announcement, AnnouncementRecipient, Conversation, Message } from '../types';
import { supabase } from '../src/lib/supabase';

export const mapToCamelCase = (obj: any) => {
  if (!obj) return obj;
  const mapping: Record<string, string> = {
    iseditable: 'isEditable',
    dealerid: 'dealerId',
    registrationapproved: 'registrationApproved',
    reputationscore: 'reputationScore',
    createdat: 'createdAt',
    modelname: 'modelName',
    pricehistory: 'priceHistory',
    variantid: 'variantId',
    assignedat: 'assignedAt',
    userid: 'userId',
    userrole: 'userRole',
    targetcollection: 'targetCollection',
    targetid: 'targetId',
    isread: 'isRead',
    lastactive: 'lastActive',
    iscurrent: 'isCurrent',
    stockorderid: 'stockOrderId',
    proofimage: 'proofImage',
    proofofpayment: 'proofOfPayment',
    customername: 'customerName',
    customerphone: 'customerPhone',
    stockitemid: 'stockItemId',
    bookingtimestamp: 'bookingTimestamp',
    sentbyuserid: 'sentByUserId',
    announcementid: 'announcementId',
    participantids: 'participantIds',
    lastmessagetimestamp: 'lastMessageTimestamp',
    conversationid: 'conversationId',
    senderid: 'senderId',
    requesttimestamp: 'requestTimestamp',
    approveditems: 'approvedItems',
    allocatedstockids: 'allocatedStockIds',
    trackingnumber: 'trackingNumber',
    ownername: 'ownerName',
    resettoken: 'resetToken',
    resettokenexpiry: 'resetTokenExpiry',
    avatarurl: 'avatarUrl',
    auth_id: 'authId',
  };

  const newObj: any = {};
  for (const key in obj) {
    const camelKey = mapping[key] || key;
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

const mapToSnakeCase = (obj: any) => {
  if (!obj) return obj;
  const newObj: any = {};
  for (const key in obj) {
    if (key === 'authId') {
      newObj['auth_id'] = obj[key];
    } else {
      newObj[key.toLowerCase()] = obj[key];
    }
  }
  return newObj;
};

const createFetchFunction = <T>(table: string) => {
  return async (): Promise<T[]> => {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return (data as any[]).map(mapToCamelCase) as T[];
  };
};

const createSaveFunction = <T extends { _id?: string }>(table: string) => {
  return async (item: T): Promise<T> => {
    const itemToSave = mapToSnakeCase(item);
    if (item._id) {
      // Update
      const { data, error } = await supabase
        .from(table)
        .update(itemToSave)
        .eq('_id', item._id)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(data) as T;
    } else {
      // Insert
      const newItem = { ...itemToSave, _id: `${table}-${Date.now()}` };
      const { data, error } = await supabase
        .from(table)
        .insert(newItem)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(data) as T;
    }
  };
};

export const api = {
  // Fetch Functions
  fetchUsers: createFetchFunction<User>('users'),
  fetchRoles: createFetchFunction<Role>('roles'),
  fetchDealers: createFetchFunction<Dealer>('dealers'),
  fetchProducts: createFetchFunction<Product>('products'),
  fetchStock: createFetchFunction<StockItem>('stock'),
  fetchStockOrders: createFetchFunction<StockOrder>('stock_orders'),
  fetchBookings: createFetchFunction<Booking>('bookings'),
  fetchDealerPayments: createFetchFunction<DealerPayment>('dealer_payments'),
  fetchAnnouncements: createFetchFunction<Announcement>('announcements'),
  fetchAnnouncementRecipients: createFetchFunction<AnnouncementRecipient>('announcement_recipients'),
  fetchConversations: createFetchFunction<Conversation>('conversations'),
  fetchMessages: createFetchFunction<Message>('messages'),
  fetchAuditLogs: createFetchFunction<any>('audit_logs'),

  // Mutation Functions
  saveUser: createSaveFunction<User>('users'),
  saveRole: createSaveFunction<Role>('roles'),
  saveDealer: createSaveFunction<Dealer>('dealers'),
  saveProduct: createSaveFunction<Product>('products'),
  saveStockItem: createSaveFunction<StockItem>('stock'),
  saveStockOrder: createSaveFunction<StockOrder>('stock_orders'),
  saveBooking: createSaveFunction<Booking>('bookings'),
  saveDealerPayment: createSaveFunction<DealerPayment>('dealer_payments'),
  saveAnnouncement: createSaveFunction<Announcement>('announcements'),
  saveAnnouncementRecipient: createSaveFunction<AnnouncementRecipient>('announcement_recipients'),
  saveConversation: createSaveFunction<Conversation>('conversations'),
  saveMessage: createSaveFunction<Message>('messages'),
  saveAuditLog: createSaveFunction<any>('audit_logs'),

  deleteUser: async (userId: string) => {
    const { error } = await supabase.from('users').delete().eq('_id', userId);
    if (error) throw error;
  },

  deleteRole: async (roleId: string) => {
    const { error } = await supabase.from('roles').delete().eq('_id', roleId);
    if (error) throw error;
  },

  // Custom endpoints
  getUserByEmail: async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return mapToCamelCase(data) as User;
  },

  requestPasswordReset: async (email: string): Promise<boolean> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      console.error("Password reset error:", error);
      return false;
    }
    return true;
  },

  resetPassword: async (token: string, newPassword: string): Promise<boolean> => {
    // With Supabase Auth, the token is handled in the URL hash and automatically sets the session.
    // If the user is on the reset password page, they should already have an active session from the link.
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      console.error("Failed to update password:", error);
      return false;
    }
    return true;
  },

  saveBulkStockStatus: async (stockIds: string[], status: any) => {
    const { data, error } = await supabase
      .from('stock')
      .update({ status })
      .in('_id', stockIds)
      .select();
    if (error) throw error;
    return (data as any[]).map(mapToCamelCase) as StockItem[];
  },

  saveApprovedOrder: async (order: StockOrder, stockUpdates: StockItem[]) => {
    // Update order
    const { data: orderData, error: orderError } = await supabase
      .from('stock_orders')
      .upsert(mapToSnakeCase(order))
      .select()
      .single();
    if (orderError) throw orderError;

    // Update stock items
    const stockIds = stockUpdates.map(s => s._id);
    const { data: stockData, error: stockError } = await supabase
      .from('stock')
      .update({ status: StockStatus.Reserved })
      .in('_id', stockIds)
      .select();
    if (stockError) throw stockError;

    return { order: mapToCamelCase(orderData) as StockOrder, stock: (stockData as any[]).map(mapToCamelCase) as StockItem[] };
  },
    
  confirmOrderReceipt: async (orderId: string) => {
    // Get order
    const { data: order, error: fetchError } = await supabase
      .from('stock_orders')
      .select('*')
      .eq('_id', orderId)
      .single();
    if (fetchError) throw fetchError;

    // Update order
    const { data: updatedOrder, error: orderError } = await supabase
      .from('stock_orders')
      .update({ status: OrderStatus.Delivered })
      .eq('_id', orderId)
      .select()
      .single();
    if (orderError) throw orderError;

    const mappedOrder = mapToCamelCase(updatedOrder) as StockOrder;

    let updatedStockItems: StockItem[] = [];
    if (mappedOrder.allocatedStockIds && mappedOrder.allocatedStockIds.length > 0) {
      const { data: stockData, error: stockError } = await supabase
        .from('stock')
        .update({ status: StockStatus.Available })
        .in('_id', mappedOrder.allocatedStockIds)
        .select();
      if (stockError) throw stockError;
      updatedStockItems = (stockData as any[]).map(mapToCamelCase) as StockItem[];
    }

    return { order: mappedOrder, stock: updatedStockItems };
  },
};
