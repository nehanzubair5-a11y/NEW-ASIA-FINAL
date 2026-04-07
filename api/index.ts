import { Dealer, Product, StockItem, StockOrder, Booking, StockStatus, User, OrderStatus, Role, DealerPayment, Announcement, AnnouncementRecipient, Conversation, Message } from '../types';
import { supabase } from '../src/lib/supabase';

const mapToCamelCase = (obj: any) => {
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
    newObj[key.toLowerCase()] = obj[key];
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

  deleteUser: async (userId: string) => {
    const { error } = await supabase.from('users').delete().eq('_id', userId);
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
    const user = await api.getUserByEmail(email);
    if (!user) return false; // Don't reveal if user exists

    // Secure token generation using Web Crypto API
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const rawToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Hash the token for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(rawToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashedToken = Array.from(new Uint8Array(hashBuffer), byte => byte.toString(16).padStart(2, '0')).join('');

    const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

    const { error } = await supabase
      .from('users')
      .update({ resettoken: hashedToken, resettokenexpiry: resetTokenExpiry })
      .eq('_id', user._id);

    if (error) throw error;

    // Simulate sending email with RAW token
    const resetUrl = `${window.location.origin}?token=${rawToken}`;
    console.log(`[SIMULATED EMAIL] Password reset requested for ${email}.`);
    console.log(`[SIMULATED EMAIL] Click here to reset: ${resetUrl}`);
    return true;
  },

  resetPassword: async (token: string, newPassword: string): Promise<boolean> => {
    // Hash the provided token to compare with database
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
    const hashedToken = Array.from(new Uint8Array(tokenHashBuffer), byte => byte.toString(16).padStart(2, '0')).join('');

    // Find user with this hashed token
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('resettoken', hashedToken)
      .single();

    if (error || !data) return false;

    const user = mapToCamelCase(data) as User;

    // Check expiry
    if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
      return false; // Token expired
    }

    // Hash the new password
    const pwData = encoder.encode(newPassword);
    const pwHashBuffer = await crypto.subtle.digest('SHA-256', pwData);
    const hashedPassword = Array.from(new Uint8Array(pwHashBuffer), byte => byte.toString(16).padStart(2, '0')).join('');

    // Update password and clear token
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        resettoken: null, 
        resettokenexpiry: null 
      })
      .eq('_id', user._id);

    if (updateError) throw updateError;
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
