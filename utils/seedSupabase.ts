import { supabase } from '../src/lib/supabase.ts';
import { MOCK_USERS, MOCK_ROLES, MOCK_DEALERS, MOCK_PRODUCTS, MOCK_STOCK, MOCK_STOCK_ORDERS, MOCK_BOOKINGS, MOCK_DEALER_PAYMENTS, MOCK_ANNOUNCEMENTS, MOCK_ANNOUNCEMENT_RECIPIENTS, MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../constants.ts';

export const seedSupabaseDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // 1. Roles
    console.log('Seeding roles...');
    for (const role of MOCK_ROLES) {
      // Postgres converts unquoted column names to lowercase.
      // To avoid schema cache issues, we map isEditable to iseditable.
      const roleToUpsert = {
        _id: role._id,
        name: role.name,
        permissions: role.permissions,
        iseditable: role.isEditable
      };
      const { error } = await supabase.from('roles').upsert(roleToUpsert);
      if (error) throw error;
    }

    // 2. Users
    console.log('Seeding users...');
    for (const user of MOCK_USERS) {
      const userToUpsert = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dealerid: user.dealerId,
        phone: user.phone,
        whatsapp: user.whatsapp,
        address: user.address,
      };
      const { error } = await supabase.from('users').upsert(userToUpsert);
      if (error) throw error;
    }

    // 3. Dealers
    console.log('Seeding dealers...');
    for (const dealer of MOCK_DEALERS) {
      const dealerToUpsert = {
        _id: dealer._id,
        name: dealer.name,
        ownername: dealer.ownerName,
        phone: dealer.phone,
        email: dealer.email,
        city: dealer.city,
        registrationapproved: dealer.registrationApproved,
        reputationscore: dealer.reputationScore,
        createdat: dealer.createdAt,
      };
      const { error } = await supabase.from('dealers').upsert(dealerToUpsert);
      if (error) throw error;
    }

    // 4. Products
    console.log('Seeding products...');
    for (const product of MOCK_PRODUCTS) {
      const productToUpsert = {
        _id: product._id,
        brand: product.brand,
        modelname: product.modelName,
        variants: product.variants,
        specifications: product.specifications,
        pricehistory: product.priceHistory || [],
      };
      const { error } = await supabase.from('products').upsert(productToUpsert);
      if (error) throw error;
    }

    // 5. Stock
    console.log('Seeding stock...');
    for (const stock of MOCK_STOCK) {
      const stockToUpsert = {
        _id: stock._id,
        vin: stock.vin,
        variantid: stock.variantId,
        dealerid: stock.dealerId,
        status: stock.status,
        assignedat: stock.assignedAt,
      };
      const { error } = await supabase.from('stock').upsert(stockToUpsert);
      if (error) throw error;
    }

    // 6. Stock Orders
    console.log('Seeding stock orders...');
    for (const order of MOCK_STOCK_ORDERS) {
      const orderToUpsert = {
        _id: order._id,
        dealerid: order.dealerId,
        requesttimestamp: order.requestTimestamp,
        status: order.status,
        items: order.items,
        approveditems: order.approvedItems || [],
        allocatedstockids: order.allocatedStockIds || [],
        trackingnumber: order.trackingNumber,
      };
      const { error } = await supabase.from('stock_orders').upsert(orderToUpsert);
      if (error) throw error;
    }

    // 7. Bookings
    console.log('Seeding bookings...');
    for (const booking of MOCK_BOOKINGS) {
      const bookingToUpsert = {
        _id: booking._id,
        customername: booking.customerName,
        customerphone: booking.customerPhone,
        dealerid: booking.dealerId,
        variantid: booking.variantId,
        stockitemid: booking.stockItemId,
        bookingtimestamp: booking.bookingTimestamp,
        status: booking.status,
        payments: booking.payments,
      };
      const { error } = await supabase.from('bookings').upsert(bookingToUpsert);
      if (error) throw error;
    }

    // 8. Dealer Payments
    console.log('Seeding dealer payments...');
    for (const payment of MOCK_DEALER_PAYMENTS) {
      const paymentToUpsert = {
        _id: payment._id,
        dealerid: payment.dealerId,
        stockorderid: payment.stockOrderId,
        amount: payment.amount,
        type: payment.type,
        reference: payment.reference,
        timestamp: payment.timestamp,
        proofofpayment: payment.proofOfPayment,
      };
      const { error } = await supabase.from('dealer_payments').upsert(paymentToUpsert);
      if (error) throw error;
    }

    // 9. Announcements
    console.log('Seeding announcements...');
    for (const announcement of MOCK_ANNOUNCEMENTS) {
      const announcementToUpsert = {
        _id: announcement._id,
        subject: announcement.subject,
        message: announcement.message,
        timestamp: announcement.timestamp,
        sentbyuserid: announcement.sentByUserId,
      };
      const { error } = await supabase.from('announcements').upsert(announcementToUpsert);
      if (error) throw error;
    }

    // 10. Announcement Recipients
    console.log('Seeding announcement recipients...');
    for (const recipient of MOCK_ANNOUNCEMENT_RECIPIENTS) {
      const recipientToUpsert = {
        _id: recipient._id,
        announcementid: recipient.announcementId,
        userid: recipient.userId,
        isread: recipient.isRead,
      };
      const { error } = await supabase.from('announcement_recipients').upsert(recipientToUpsert);
      if (error) throw error;
    }

    // 11. Conversations
    console.log('Seeding conversations...');
    for (const conversation of MOCK_CONVERSATIONS) {
      const conversationToUpsert = {
        _id: conversation._id,
        participantids: conversation.participantIds,
        lastmessagetimestamp: conversation.lastMessageTimestamp,
      };
      const { error } = await supabase.from('conversations').upsert(conversationToUpsert);
      if (error) throw error;
    }

    // 12. Messages
    console.log('Seeding messages...');
    for (const message of MOCK_MESSAGES) {
      const messageToUpsert = {
        _id: message._id,
        conversationid: message.conversationId,
        senderid: message.senderId,
        content: message.content,
        timestamp: message.timestamp,
        isread: message.isRead,
      };
      const { error } = await supabase.from('messages').upsert(messageToUpsert);
      if (error) throw error;
    }

    console.log('Database seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};
