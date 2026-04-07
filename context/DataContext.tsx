import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  Dealer, Product, StockItem, StockStatus, StockOrder, OrderStatus, ApprovedOrderItem,
  Booking, Payment, StockOrderItem, Recommendation, DataContextType, ActionType, ProductVariant, BookingStatus, DealerPayment, Announcement, AnnouncementRecipient,
  Conversation, Message, Notification
} from '../types.ts';
import { useAppContext } from '../hooks/useAppContext.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { api } from '../api/index.ts';

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { logAction, settings, setNotifications, users, notifications } = useAppContext();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [stock, setStock] = useState<StockItem[]>([]);
    const [stockOrders, setStockOrders] = useState<StockOrder[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [dealerPayments, setDealerPayments] = useState<DealerPayment[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [announcementRecipients, setAnnouncementRecipients] = useState<AnnouncementRecipient[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);


    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [
                    dealersData,
                    productsData,
                    stockData,
                    stockOrdersData,
                    bookingsData,
                    dealerPaymentsData,
                    announcementsData,
                    announcementRecipientsData,
                    conversationsData,
                    messagesData,
                ] = await Promise.all([
                    api.fetchDealers(),
                    api.fetchProducts(),
                    api.fetchStock(),
                    api.fetchStockOrders(),
                    api.fetchBookings(),
                    api.fetchDealerPayments(),
                    api.fetchAnnouncements(),
                    api.fetchAnnouncementRecipients(),
                    api.fetchConversations(),
                    api.fetchMessages(),
                ]);
                setDealers(dealersData as Dealer[]);
                setProducts(productsData as Product[]);
                setStock(stockData as StockItem[]);
                setStockOrders(stockOrdersData as StockOrder[]);
                setBookings(bookingsData as Booking[]);
                setDealerPayments(dealerPaymentsData as DealerPayment[]);
                setAnnouncements(announcementsData as Announcement[]);
                setAnnouncementRecipients(announcementRecipientsData as AnnouncementRecipient[]);
                setConversations(conversationsData as Conversation[]);
                setMessages(messagesData as Message[]);
            } catch (error) {
                console.error("Failed to load initial data", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    useEffect(() => {
        if (isLoading || !user || user.role === 'Dealer') {
            return; // Don't run until data is loaded or for dealers
        }

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const newNotifications: Notification[] = [];

        // 1. Pending Stock Orders
        const oldPendingOrders = stockOrders.filter(
            o => o.status === OrderStatus.Pending && new Date(o.requestTimestamp) < twentyFourHoursAgo
        ).length;
        
        if (oldPendingOrders > 0) {
            const message = `${oldPendingOrders} stock order(s) have been pending approval for over 24 hours.`;
            if (!notifications.some(n => n.message === message && !n.isRead)) {
                newNotifications.push({
                    _id: `reminder-orders-${Date.now()}`,
                    message,
                    timestamp: now.toISOString(),
                    isRead: false,
                    link: { page: 'Approvals' } 
                });
            }
        }
        
        // 2. Pending Dealer Registrations
        const oldPendingDealers = dealers.filter(
            d => !d.registrationApproved && new Date(d.createdAt) < twentyFourHoursAgo
        ).length;

        if (oldPendingDealers > 0) {
            const message = `${oldPendingDealers} dealer registration(s) are awaiting approval for over 24 hours.`;
            if (!notifications.some(n => n.message === message && !n.isRead)) {
                newNotifications.push({
                    _id: `reminder-dealers-${Date.now()}`,
                    message,
                    timestamp: now.toISOString(),
                    isRead: false,
                    link: { page: 'Dealers' } 
                });
            }
        }

        // 3. Pending Bookings
        const oldPendingBookings = bookings.filter(
            b => b.status === BookingStatus.Pending && new Date(b.bookingTimestamp) < twentyFourHoursAgo
        ).length;

        if (oldPendingBookings > 0) {
            const message = `${oldPendingBookings} booking(s) are pending stock allocation for over 24 hours.`;
            if (!notifications.some(n => n.message === message && !n.isRead)) {
                newNotifications.push({
                    _id: `reminder-bookings-${Date.now()}`,
                    message,
                    timestamp: now.toISOString(),
                    isRead: false,
                    link: { page: 'Bookings' }
                });
            }
        }

        // 4. Low Stock Warning
        if (settings.notifications.lowStockWarning) {
             const centralStock = stock.filter(s => s.dealerId === null && s.status === StockStatus.Available);
             const variantCounts: Record<string, number> = {};
             centralStock.forEach(s => { variantCounts[s.variantId] = (variantCounts[s.variantId] || 0) + 1; });
             
             products.forEach(p => {
                 p.variants.forEach(v => {
                     const count = variantCounts[v._id] || 0;
                     if (count < 5) { // Threshold for low stock
                         const message = `Low stock warning: ${p.modelName} (${v.name}) has only ${count} units left.`;
                         // Avoid spamming: Check if notified in the last 24h
                         const recentlyNotified = notifications.some(n => 
                             n.message === message && 
                             new Date(n.timestamp) > twentyFourHoursAgo
                         );
                         
                         if (!recentlyNotified) {
                             newNotifications.push({
                                 _id: `warn-stock-${v._id}-${Date.now()}`,
                                 message,
                                 timestamp: now.toISOString(),
                                 isRead: false,
                                 link: { page: 'CompanyStock' }
                             });
                         }
                     }
                 });
             });
        }

        if (newNotifications.length > 0) {
            setNotifications(prev => [...newNotifications, ...prev]);
        }
    }, [isLoading, stockOrders, dealers, bookings, user, setNotifications, notifications, stock, products, settings.notifications.lowStockWarning]);


    const getRecommendationForItem = useCallback((item: StockOrderItem, dealerId: string): Recommendation => {
        const centralStockCount = stock.filter(s => s.variantId === item.variantId && s.dealerId === null).length;
        const dealer = dealers.find(d => d._id === dealerId);
        
        if (!dealer) return { type: 'Review', reason: 'Dealer not found.' };

        const dealerStockForVariant = stock.filter(s => s.dealerId === dealer._id && s.variantId === item.variantId).length;
        const dealerDeliveredBookings = bookings.filter(b => b.dealerId === dealer._id && b.status === 'Delivered');
        const recentSalesForVariant = dealerDeliveredBookings.filter(b => 
            b.variantId === item.variantId && new Date(b.bookingTimestamp).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
        ).length;
        const isOverstocked = dealerStockForVariant > Math.max(5, recentSalesForVariant * 2);

        const reputationFactor = 0.7 + (dealer.reputationScore / 10) * 0.3;
        const allDeliveredBookings = bookings.filter(b => b.status === 'Delivered');
        const variantSalesCount = allDeliveredBookings.filter(b => b.variantId === item.variantId).length;
        const totalSales = allDeliveredBookings.length;
        const uniqueVariantsSoldCount = new Set(allDeliveredBookings.map(b => b.variantId)).size;
        const averageSalesPerVariant = totalSales / (uniqueVariantsSoldCount || 1);
        const demandFactor = Math.max(0.9, Math.min(1.25, 1 + ((variantSalesCount - averageSalesPerVariant) / (averageSalesPerVariant * 2 || 1))));

        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
        const last30DaysSales = dealerDeliveredBookings.filter(b => new Date(b.bookingTimestamp).getTime() > thirtyDaysAgo).length;
        const prev60DaysSales = dealerDeliveredBookings.filter(b => {
            const ts = new Date(b.bookingTimestamp).getTime();
            return ts <= thirtyDaysAgo && ts > ninetyDaysAgo;
        }).length;
        const normalizedPrevSales = prev60DaysSales / 2;
        let velocityFactor = 1.0;
        if (last30DaysSales > normalizedPrevSales + 1) velocityFactor = 1.1;
        else if (last30DaysSales < normalizedPrevSales) velocityFactor = 0.95;

        const combinedFactor = reputationFactor * demandFactor * velocityFactor;
        const mlOptimalQty = Math.min(item.quantity, Math.round(item.quantity * combinedFactor));

        const getMlExplanation = (): { reason: string; factors: string[] } => {
            const factors: string[] = [];
            if (demandFactor > 1.1) factors.push("high demand");
            if (velocityFactor > 1.0) factors.push("positive sales trend");
            else if (velocityFactor < 1.0) factors.push("sales slowdown");
            if (dealer.reputationScore > 8.5) factors.push("strong reputation");
            if (factors.length === 0) return { reason: 'ML predicts standard sales potential.', factors: [] };
            return { reason: `Suggestion based on ${factors.join(' & ')}.`, factors };
        };

        const mlExplanation = getMlExplanation();
        
        if (isOverstocked) {
            return { type: 'Reject', reason: `Overstocked: Dealer already holds ${dealerStockForVariant} units.` };
        }
        
        if (centralStockCount === 0) return { type: 'Reject', reason: 'Critical Stock: No units available.' };
        if (dealer.reputationScore >= 9 && centralStockCount >= item.quantity) return { type: 'Approve', reason: `Elite Dealer (${dealer.reputationScore.toFixed(1)}) with sufficient stock.` };
        
        const isLowReputation = dealer.reputationScore < 5;
        const isStockLimited = centralStockCount < item.quantity;

        if (isLowReputation || isStockLimited) {
            let reason = isLowReputation ? `Low dealer reputation score (${dealer.reputationScore.toFixed(1)}).` : `Limited Stock: Only ${centralStockCount} units available.`;
            if (isLowReputation && isStockLimited) reason = `Low Reputation (${dealer.reputationScore.toFixed(1)}) and Limited Stock (${centralStockCount} available).`;
            return { type: 'Review', reason: `${reason} Manual review flagged.`, mlQuantity: mlOptimalQty, mlReasoningFactors: mlExplanation.factors };
        }

        return { type: 'Review', reason: mlExplanation.reason, mlQuantity: mlOptimalQty, mlReasoningFactors: mlExplanation.factors };
    }, [dealers, stock, bookings]);

    const addDealer = async (dealerData: Omit<Dealer, '_id' | 'createdAt' | 'registrationApproved'>) => {
        const newDealerStub: Dealer = { ...dealerData, _id: `dealer-${Date.now()}`, createdAt: new Date().toISOString(), registrationApproved: true };
        const savedDealer = await api.saveDealer(newDealerStub);
        setDealers(prev => [...prev, savedDealer]);
        logAction(ActionType.Create, 'Dealers', savedDealer._id, `Created new dealer ${savedDealer.name}`);
    };

    const registerDealer = async (dealerData: Omit<Dealer, '_id' | 'createdAt' | 'registrationApproved' | 'reputationScore'>) => {
        const newDealerStub: Dealer = { ...dealerData, _id: `dealer-${Date.now()}`, createdAt: new Date().toISOString(), registrationApproved: false, reputationScore: 5.0 };
        const newDealer = await api.saveDealer(newDealerStub);
        setDealers(prev => [...prev, newDealer]);
        logAction(ActionType.Create, 'Dealers', newDealer._id, `New dealer registration: ${newDealer.name}`);
        return newDealer;
    };
    
    const updateDealer = async (updatedDealer: Dealer) => {
        const savedDealer = await api.saveDealer(updatedDealer);
        setDealers(prev => prev.map(d => d._id === savedDealer._id ? savedDealer : d));
        logAction(ActionType.Update, 'Dealers', savedDealer._id, `Updated details for ${savedDealer.name}`);
    };

    const approveDealer = async (dealerId: string) => {
        const dealer = dealers.find(d => d._id === dealerId);
        if (!dealer) return;
        const updatedDealer = { ...dealer, registrationApproved: true };
        const savedDealer = await api.saveDealer(updatedDealer);
        setDealers(prev => prev.map(d => d._id === savedDealer._id ? savedDealer : d));
        logAction(ActionType.Approve, 'Dealers', dealerId, `Approved registration for ${savedDealer?.name}`);
    };

    const revokeDealer = async (dealerId: string) => {
        const dealer = dealers.find(d => d._id === dealerId);
        if (!dealer) return;
        const updatedDealer = { ...dealer, registrationApproved: false };
        const savedDealer = await api.saveDealer(updatedDealer);
        setDealers(prev => prev.map(d => d._id === savedDealer._id ? savedDealer : d));
        logAction(ActionType.Update, 'Dealers', dealerId, `Revoked approval for ${savedDealer.name}.`);
    };

    const updateDealerStatusBulk = async (dealerIds: string[], approved: boolean) => {
        const dealersToUpdate = dealers.filter(d => dealerIds.includes(d._id));
        if (dealersToUpdate.length === 0) return;

        const updatedDealerObjects = dealersToUpdate.map(d => ({ ...d, registrationApproved: approved }));
        
        await Promise.all(updatedDealerObjects.map(api.saveDealer));

        setDealers(prevDealers => 
            prevDealers.map(d => {
                const updatedVersion = updatedDealerObjects.find(ud => ud._id === d._id);
                return updatedVersion || d;
            })
        );
        logAction(ActionType.Update, 'Dealers', undefined, `Bulk ${approved ? 'approved' : 'revoked'} ${dealerIds.length} dealers.`);
    };

    const recalculateReputation = async (dealerId: string) => {
        const dealer = dealers.find(d => d._id === dealerId);
        if (!dealer) return;
        const newScore = parseFloat((Math.random() * 5 + 5).toFixed(1)); // Score between 5.0 and 10.0
        const updatedDealer = { ...dealer, reputationScore: newScore };
        const savedDealer = await api.saveDealer(updatedDealer);
        setDealers(prev => prev.map(d => d._id === dealerId ? savedDealer : d));
        logAction(ActionType.Update, 'Dealers', dealerId, `Recalculated reputation score for ${dealer.name} to ${newScore}.`);
    };
    
    const addProduct = async (productData: Omit<Product, '_id' | 'priceHistory'>) => {
        const newProductStub: Product = { ...productData, _id: `prod-${Date.now()}`, priceHistory: [] };
        const newProduct = await api.saveProduct(newProductStub);
        setProducts(prev => [...prev, newProduct]);
        logAction(ActionType.Create, 'Products', newProduct._id, `Created product ${newProduct.modelName}`);
    };
    
    const updateProduct = async (updatedProduct: Product) => {
        const oldProduct = products.find(p => p._id === updatedProduct._id);
        const savedProduct = await api.saveProduct(updatedProduct);
        
        let changeDetails: string[] = [];

        if (oldProduct) {
            if (oldProduct.brand !== savedProduct.brand) changeDetails.push(`Brand: ${oldProduct.brand} -> ${savedProduct.brand}`);
            if (oldProduct.modelName !== savedProduct.modelName) changeDetails.push(`Model: ${oldProduct.modelName} -> ${savedProduct.modelName}`);
            
            // Compare Variants
            const oldVariantsMap = new Map<string, ProductVariant>(oldProduct.variants.map(v => [v._id, v]));
            const newVariantsMap = new Map<string, ProductVariant>(savedProduct.variants.map(v => [v._id, v]));

            // Check updates and additions
            savedProduct.variants.forEach(newVar => {
                const oldVar = oldVariantsMap.get(newVar._id);
                if (oldVar) {
                    if (oldVar.price !== newVar.price) {
                        changeDetails.push(`Price (${newVar.name} - ${newVar.color}): ${oldVar.price} -> ${newVar.price}`);
                    }
                    if (oldVar.sku !== newVar.sku) {
                        changeDetails.push(`SKU (${newVar.name} - ${newVar.color}): ${oldVar.sku} -> ${newVar.sku}`);
                    }
                } else {
                    changeDetails.push(`Added variant: ${newVar.name} (${newVar.color})`);
                }
            });

            // Check deletions
            oldProduct.variants.forEach(oldVar => {
                if (!newVariantsMap.has(oldVar._id)) {
                    changeDetails.push(`Removed variant: ${oldVar.name} (${oldVar.color})`);
                }
            });
        }

        const logMessage = changeDetails.length > 0 
            ? `Updated product ${savedProduct.modelName}: ${changeDetails.join(', ')}`
            : `Updated product ${savedProduct.modelName} (No detected changes)`;

        setProducts(prev => prev.map(p => p._id === savedProduct._id ? savedProduct : p));
        logAction(ActionType.Update, 'Products', savedProduct._id, logMessage);
    };

    const addOrUpdateProductsBulk = async (productsToImport: Omit<Product, '_id' | 'priceHistory'>[]): Promise<{ created: number; updated: number; }> => {
        let createdCount = 0;
        let updatedCount = 0;
    
        const newProductList: Product[] = JSON.parse(JSON.stringify(products));
    
        for (const productFromCsv of productsToImport) {
            const productIndex = newProductList.findIndex((p: Product) =>
                p.brand.toLowerCase() === productFromCsv.brand.toLowerCase() &&
                p.modelName.toLowerCase() === productFromCsv.modelName.toLowerCase()
            );
    
            if (productIndex !== -1) {
                const existingProduct = newProductList[productIndex];
                let hasChanges = false;
    
                const existingVariantsBySku = new Map(existingProduct.variants.map((v: ProductVariant) => [v.sku.toLowerCase(), v]));
    
                for (const variantFromCsv of productFromCsv.variants) {
                    const existingVariant = existingVariantsBySku.get(variantFromCsv.sku.toLowerCase());
    
                    if (existingVariant) {
                        if (existingVariant.name !== variantFromCsv.name || existingVariant.price !== variantFromCsv.price) {
                            existingVariant.name = variantFromCsv.name;
                            existingVariant.price = variantFromCsv.price;
                            hasChanges = true;
                        }
                    } else {
                        existingProduct.variants.push({
                            ...variantFromCsv,
                            _id: `v-new-${Date.now()}-${Math.random()}`
                        });
                        hasChanges = true;
                    }
                }
    
                if (hasChanges) {
                    await api.saveProduct(existingProduct); 
                    updatedCount++;
                }
            } else {
                const newProduct: Product = {
                    ...productFromCsv,
                    _id: `prod-new-${Date.now()}-${Math.random()}`,
                    priceHistory: [],
                    variants: productFromCsv.variants.map(v => ({
                        ...v,
                        _id: `v-new-${Date.now()}-${Math.random()}`
                    }))
                };
                newProductList.push(newProduct);
                await api.saveProduct(newProduct); 
                createdCount++;
            }
        }
    
        if (createdCount > 0 || updatedCount > 0) {
            setProducts(newProductList);
            logAction(ActionType.Update, 'Products', undefined, `Bulk import: ${createdCount} created, ${updatedCount} updated.`);
        }
    
        return { created: createdCount, updated: updatedCount };
    };

    const addStock = async (stockData: Omit<StockItem, '_id' | 'assignedAt'>) => {
        const newStockItem: StockItem = {
            ...stockData,
            _id: `stock-${Date.now()}`,
            assignedAt: new Date().toISOString(),
        };
        const savedItem = await api.saveStockItem(newStockItem);
        setStock(prev => [savedItem, ...prev]);
        logAction(ActionType.Create, 'Stock', savedItem._id, `Added new stock item with VIN ${savedItem.vin}`);
    };

    const updateStockStatusBulk = async (stockIds: string[], status: StockStatus) => {
        const updatedItems = await api.saveBulkStockStatus(stockIds, status);
        setStock(prev => prev.map(s => {
            const updated = updatedItems.find(i => i._id === s._id);
            return updated ? updated : s;
        }));
        logAction(ActionType.Update, 'Stock', undefined, `Bulk updated ${stockIds.length} items to ${status}`);
    };

    const processAllocationRequest = async (orderId: string, approvedItems: ApprovedOrderItem[], status: OrderStatus) => {
        const order = stockOrders.find(o => o._id === orderId);
        if (!order) return;

        const stockToUpdate: StockItem[] = [];
        const allocatedStockIds: string[] = [];
        let anyStockAssigned = false;

        for (const item of approvedItems) {
            if (item.approvedQuantity > 0) {
                const availableStock = stock.filter(s => s.variantId === item.variantId && s.dealerId === null && s.status === StockStatus.Available);
                const itemsToAssign = availableStock.slice(0, item.approvedQuantity);

                if (itemsToAssign.length > 0) anyStockAssigned = true;

                for (const stockItem of itemsToAssign) {
                    stockToUpdate.push({ ...stockItem, dealerId: order.dealerId, assignedAt: new Date().toISOString() });
                    allocatedStockIds.push(stockItem._id);
                }
            }
        }

        const updatedOrder: StockOrder = { ...order, status, approvedItems, allocatedStockIds };

        const { order: savedOrder, stock: savedStock } = await api.saveApprovedOrder(updatedOrder, stockToUpdate);

        setStockOrders(prev => prev.map(o => o._id === savedOrder._id ? savedOrder : o));

        setStock(prev => prev.map(s => {
            const updated = savedStock.find(i => i._id === s._id);
            return updated || s;
        }));

        logAction(ActionType.Approve, 'StockOrders', orderId, `Order processed with status: ${status}.`);

        // Notification Logic
        if (status === OrderStatus.Rejected && settings.notifications.orderRejected) {
             setNotifications(prev => [{
                _id: `notif-rej-${Date.now()}`,
                message: `Stock order #${orderId.slice(-4)} was rejected.`,
                timestamp: new Date().toISOString(),
                isRead: false,
                link: { page: 'Stock Orders' }
            }, ...prev]);
        }

        if (anyStockAssigned && settings.notifications.orderApproved) {
            setNotifications(prev => [{
                _id: `notif-${Date.now()}`,
                message: `Stock has been allocated for order #${orderId.slice(-4)}.`,
                timestamp: new Date().toISOString(),
                isRead: false,
                link: { page: 'Stock Orders' }
            }, ...prev]);
        }
    };
    
    const dispatchStockOrder = async (orderId: string, trackingNumber?: string) => {
        const order = stockOrders.find(o => o._id === orderId);
        if (!order) throw new Error("Order not found");

        const updatedOrder = { ...order, status: OrderStatus.Dispatched, trackingNumber };
        const savedOrder = await api.saveStockOrder(updatedOrder);

        setStockOrders(prev => prev.map(o => o._id === savedOrder._id ? savedOrder : o));
        logAction(ActionType.Dispatch, 'StockOrders', orderId, `Order #${orderId.slice(-4)} marked as dispatched.`);
    };

    const confirmOrderReceipt = async (orderId: string) => {
        const { order: updatedOrder, stock: updatedStock } = await api.confirmOrderReceipt(orderId);

        setStockOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
        
        setStock(prev => prev.map(s => {
            const updated = updatedStock.find(us => us._id === s._id);
            return updated || s;
        }));
        
        logAction(ActionType.Update, 'StockOrders', orderId, `Dealer confirmed receipt of order #${orderId.slice(-4)}.`);
    };

    const createStockOrder = async (orderData: Omit<StockOrder, '_id' | 'requestTimestamp' | 'status' | 'approvedItems'>) => {
        const newOrder: StockOrder = {
            ...orderData,
            _id: `alloc-${Date.now()}`,
            requestTimestamp: new Date().toISOString(),
            status: OrderStatus.Pending,
        };
        const savedOrder = await api.saveStockOrder(newOrder);
        setStockOrders(prev => [savedOrder, ...prev]);
        logAction(ActionType.Create, 'StockOrders', savedOrder._id, `New stock order created by dealer ${savedOrder.dealerId}`);
        if (settings.notifications.newOrder) {
            setNotifications(prev => [{
                _id: `notif-${Date.now()}`,
                message: `New stock order #${savedOrder._id.slice(-4)} is pending review.`,
                timestamp: new Date().toISOString(),
                isRead: false,
                link: { page: 'Approvals' }
            }, ...prev]);
        }
    };
    
    const addBooking = async (bookingData: Omit<Booking, '_id' | 'bookingTimestamp' | 'payments' | 'stockItemId'>) => {
        const newBooking: Booking = {
            ...bookingData,
            _id: `booking-${Date.now()}`,
            bookingTimestamp: new Date().toISOString(),
            payments: [],
        };
        const savedBooking = await api.saveBooking(newBooking);
        setBookings(prev => [savedBooking, ...prev]);
        logAction(ActionType.Create, 'Bookings', savedBooking._id, `New booking for ${savedBooking.customerName}`);
    };
    
    const updateBooking = async (updatedBooking: Booking) => {
        const savedBooking = await api.saveBooking(updatedBooking);
        setBookings(prev => prev.map(b => b._id === savedBooking._id ? savedBooking : b));
        logAction(ActionType.Update, 'Bookings', savedBooking._id, `Updated booking for ${savedBooking.customerName}`);
    };

    const cancelBooking = async (bookingId: string) => {
        const bookingToCancel = bookings.find(b => b._id === bookingId);
        if (!bookingToCancel) throw new Error("Booking not found");

        const updatedBooking: Booking = { ...bookingToCancel, status: BookingStatus.Cancelled };

        let savedStockItem: StockItem | null = null;
        if (bookingToCancel.stockItemId) {
            const stockItemToRelease = stock.find(s => s._id === bookingToCancel.stockItemId);
            if (stockItemToRelease && stockItemToRelease.status === StockStatus.Reserved) {
                const updatedStockItem: StockItem = { ...stockItemToRelease, status: StockStatus.Available, dealerId: null };
                savedStockItem = await api.saveStockItem(updatedStockItem);
            }
        }

        const savedBooking = await api.saveBooking(updatedBooking);

        setBookings(prev => prev.map(b => b._id === savedBooking._id ? savedBooking : b));
        if (savedStockItem) {
            setStock(prev => prev.map(s => s._id === savedStockItem!._id ? savedStockItem! : s));
        }

        logAction(ActionType.Update, 'Bookings', bookingId, `Cancelled booking for ${savedBooking.customerName}`);
    };
    
    const addPayment = async (bookingId: string, payment: Payment) => {
        const booking = bookings.find(b => b._id === bookingId);
        if (!booking) return;
        const updatedBooking = { ...booking, payments: [...booking.payments, payment] };
        const savedBooking = await api.saveBooking(updatedBooking);
        setBookings(prev => prev.map(b => b._id === savedBooking._id ? savedBooking : b));
        logAction(ActionType.Update, 'Bookings', bookingId, `Added payment of Rs. ${payment.amount} for ${booking.customerName}`);
    };

    const addDealerPayment = async (paymentData: Omit<DealerPayment, '_id' | 'timestamp'>) => {
        const newPayment: DealerPayment = {
            ...paymentData,
            _id: `dp-${Date.now()}`,
            timestamp: new Date().toISOString(),
        };
        const savedPayment = await api.saveDealerPayment(newPayment);
        setDealerPayments(prev => [savedPayment, ...prev]);
        const dealerName = dealers.find(d => d._id === savedPayment.dealerId)?.name || 'a dealer';
        logAction(ActionType.Create, 'DealerPayments', savedPayment._id, `Recorded payment of Rs. ${savedPayment.amount} from ${dealerName}`);
    };

    const allocateStockToBooking = async (bookingId: string, stockItemId: string) => {
        const booking = bookings.find(b => b._id === bookingId);
        const stockItem = stock.find(s => s._id === stockItemId);

        if (!booking || !stockItem) {
            throw new Error('Booking or Stock Item not found');
        }

        const updatedBooking: Booking = {
            ...booking,
            status: BookingStatus.Allocated,
            stockItemId: stockItemId,
        };
        const updatedStockItem: StockItem = {
            ...stockItem,
            status: StockStatus.Reserved,
            dealerId: booking.dealerId, // Ensure stock is assigned to dealer
        };

        const [savedBooking, savedStockItem] = await Promise.all([
            api.saveBooking(updatedBooking),
            api.saveStockItem(updatedStockItem),
        ]);

        setBookings(prev => prev.map(b => b._id === savedBooking._id ? savedBooking : b));
        setStock(prev => prev.map(s => s._id === savedStockItem._id ? savedStockItem : s));

        logAction(ActionType.Update, 'Bookings', bookingId, `Allocated VIN ${stockItem.vin} to booking.`);
    };

    const addAnnouncement = async (subject: string, message: string) => {
        if (!user) return;
        const newAnnouncement: Announcement = {
            _id: `anno-${Date.now()}`,
            subject,
            message,
            timestamp: new Date().toISOString(),
            sentByUserId: user._id,
        };
        const savedAnnouncement = await api.saveAnnouncement(newAnnouncement);
        setAnnouncements(prev => [savedAnnouncement, ...prev]);

        const dealerUsers = users.filter(u => u.role === 'Dealer');
        const newRecipients: AnnouncementRecipient[] = [];
        for (const dealerUser of dealerUsers) {
            const recipient: AnnouncementRecipient = {
                _id: `rec-${Date.now()}-${dealerUser._id}`,
                announcementId: savedAnnouncement._id,
                userId: dealerUser._id,
                isRead: false,
            };
            const savedRecipient = await api.saveAnnouncementRecipient(recipient);
            newRecipients.push(savedRecipient);
        }
        setAnnouncementRecipients(prev => [...prev, ...newRecipients]);

        logAction(ActionType.Create, 'Announcements', savedAnnouncement._id, `Sent announcement: "${subject}"`);
    };

    const markAnnouncementAsRead = async (announcementId: string) => {
        if (!user) return;
        const recipient = announcementRecipients.find(r => r.announcementId === announcementId && r.userId === user._id);
        if (recipient && !recipient.isRead) {
            const updatedRecipient = { ...recipient, isRead: true };
            const savedRecipient = await api.saveAnnouncementRecipient(updatedRecipient);
            setAnnouncementRecipients(prev => prev.map(r => r._id === savedRecipient._id ? savedRecipient : r));
        }
    };

    const sendMessage = async (recipientId: string, content: string) => {
        if (!user) return;
        const now = new Date().toISOString();

        // Find or create conversation
        let conversation = conversations.find(c => 
            c.participantIds.includes(user._id) && c.participantIds.includes(recipientId)
        );

        if (!conversation) {
            const newConversation: Conversation = {
                _id: `convo-${Date.now()}`,
                participantIds: [user._id, recipientId],
                lastMessageTimestamp: now,
            };
            conversation = await api.saveConversation(newConversation);
            setConversations(prev => [conversation!, ...prev]);
        } else {
            const updatedConversation = { ...conversation, lastMessageTimestamp: now };
            conversation = await api.saveConversation(updatedConversation);
            setConversations(prev => prev.map(c => c._id === conversation!._id ? conversation! : c));
        }

        // Create message
        const newMessage: Message = {
            _id: `msg-${Date.now()}`,
            conversationId: conversation._id,
            senderId: user._id,
            content,
            timestamp: now,
            isRead: false,
        };
        const savedMessage = await api.saveMessage(newMessage);
        setMessages(prev => [...prev, savedMessage]);
        logAction(ActionType.Create, 'Messages', savedMessage._id, `Sent message to user ${recipientId}`);
    };

    const markConversationAsRead = async (conversationId: string) => {
        if (!user) return;
        const unreadMessages = messages.filter(m => 
            m.conversationId === conversationId && m.senderId !== user._id && !m.isRead
        );
        if (unreadMessages.length === 0) return;

        const updatedMessages = await Promise.all(
            unreadMessages.map(m => api.saveMessage({ ...m, isRead: true }))
        );

        setMessages(prev => prev.map(m => {
            const updated = updatedMessages.find(um => um._id === m._id);
            return updated || m;
        }));
    };

    const restoreDataState = (newState: any) => {
        if (newState.dealers) setDealers(newState.dealers);
        if (newState.products) setProducts(newState.products);
        if (newState.stock) setStock(newState.stock);
        if (newState.stockOrders) setStockOrders(newState.stockOrders);
        if (newState.bookings) setBookings(newState.bookings);
        if (newState.dealerPayments) setDealerPayments(newState.dealerPayments);
        logAction(ActionType.Update, 'System', undefined, 'System state restored from backup.');
    };
    
    const value: DataContextType = {
        isLoading, dealers, products, stock, stockOrders, bookings, dealerPayments, announcements, announcementRecipients,
        conversations, messages,
        addDealer, updateDealer, approveDealer, revokeDealer, updateDealerStatusBulk,
        recalculateReputation,
        registerDealer,
        addProduct, updateProduct, addOrUpdateProductsBulk,
        addStock,
        updateStockStatusBulk, processAllocationRequest, dispatchStockOrder, confirmOrderReceipt, createStockOrder,
        addBooking, updateBooking, cancelBooking, addPayment, addDealerPayment, allocateStockToBooking,
        addAnnouncement, markAnnouncementAsRead,
        sendMessage, markConversationAsRead,
        getRecommendationForItem,
        restoreDataState,
    };
    
    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}