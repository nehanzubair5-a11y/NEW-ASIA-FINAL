import React, { useState, useMemo } from 'react';
import { useData } from '../../hooks/useData.ts';
import { Page, StockStatus, OrderStatus, BookingStatus, Product, ProductVariant, PaymentType, StockOrder } from '../../types.ts';
import { ArrowLeftIcon, BoxIcon, CalendarIcon, CheckSquareIcon, DollarSignIcon, StarIcon, PrintIcon, WhatsAppIcon, RefreshCwIcon, MessageSquareIcon, ImageIcon, ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon } from '../icons/Icons.tsx';
import StatCard from '../shared/StatCard.tsx';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import SkeletonLoader from '../shared/SkeletonLoader.tsx';
import { printElementById, createWhatsAppLink } from '../../utils/print.ts';
import Tooltip from '../shared/Tooltip.tsx';
import DealerPaymentModal from '../modals/DealerPaymentModal.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';

type DetailTab = 'overview' | 'stock' | 'orders' | 'bookings' | 'financials';

interface TableColumn {
    label: string;
    key?: string; // If provided, enables sorting on this key
    className?: string;
}

const DealerDetail: React.FC<{ dealerId: string; setActivePage: (page: Page, state?: any) => void; showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ dealerId, setActivePage, showToast }) => {
    const { dealers, stock, stockOrders, bookings, products, isLoading, dealerPayments, recalculateReputation } = useData();
    const { users } = useAppContext();
    const { canRecalculateReputation } = usePermissions();
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);

    const dealer = useMemo(() => dealers.find(d => d._id === dealerId), [dealers, dealerId]);
    
    const findProductInfo = (variantId: string): { product: Product | null, variant: ProductVariant | null } => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) return { product, variant };
        }
        return { product: null, variant: null };
    };

    const dealerStock = useMemo(() => stock.filter(s => s.dealerId === dealerId), [stock, dealerId]);
    const dealerOrders = useMemo(() => stockOrders.filter(o => o.dealerId === dealerId), [stockOrders, dealerId]);
    const dealerBookings = useMemo(() => bookings.filter(b => b.dealerId === dealerId), [bookings, dealerId]);
    const paymentsForDealer = useMemo(() => dealerPayments.filter(p => p.dealerId === dealerId), [dealerPayments, dealerId]);

    // Pre-process data for sorting
    const enrichedStock = useMemo(() => dealerStock.map(item => {
        const { product, variant } = findProductInfo(item.variantId);
        return {
            ...item,
            productName: `${product?.modelName} (${variant?.name})`,
        };
    }), [dealerStock, products]);

    const enrichedOrders = useMemo(() => dealerOrders.map(order => ({
        ...order,
        totalRequested: order.items.reduce((sum, i) => sum + i.quantity, 0),
        totalApproved: order.approvedItems?.reduce((sum, i) => sum + i.approvedQuantity, 0) ?? 0,
    })), [dealerOrders]);

    const enrichedBookings = useMemo(() => dealerBookings.map(booking => {
        const { product, variant } = findProductInfo(booking.variantId);
        return {
            ...booking,
            productName: `${product?.modelName} (${variant?.name})`,
        };
    }), [dealerBookings, products]);

    const stats = useMemo(() => {
        const totalStockValue = dealerStock.reduce((sum, item) => {
            const { variant } = findProductInfo(item.variantId);
            return sum + (variant?.price || 0);
        }, 0);
        const pendingOrders = dealerOrders.filter(o => o.status === OrderStatus.Pending).length;
        const deliveredBookings = dealerBookings.filter(b => b.status === BookingStatus.Delivered);
        const totalRevenue = deliveredBookings.reduce((sum, booking) => {
            const { variant } = findProductInfo(booking.variantId);
            return sum + (variant?.price || 0);
        }, 0);

        return {
            totalStockValue,
            pendingOrders,
            totalRevenue,
            totalBookings: dealerBookings.length,
        };
    }, [dealerStock, dealerOrders, dealerBookings, products]);

    // Move financialSummary useMemo to the top level
    const financialSummary = useMemo(() => {
        const ordersWithValues = dealerOrders
            .filter(o => o.status !== OrderStatus.Pending && o.status !== OrderStatus.Rejected)
            .map(order => {
                const orderValue = order.approvedItems?.reduce((sum, item) => {
                    const variant = findProductInfo(item.variantId).variant;
                    return sum + (item.approvedQuantity * (variant?.price || 0));
                }, 0) ?? 0;

                const paidAmount = paymentsForDealer
                    .filter(p => p.stockOrderId === order._id)
                    .reduce((sum, p) => sum + p.amount, 0);
                
                return {
                    order,
                    orderValue,
                    paidAmount,
                    balance: orderValue - paidAmount,
                };
            });
        
        const unlinkedPayments = paymentsForDealer.filter(p => !p.stockOrderId);
        const totalOrderValue = ordersWithValues.reduce((sum, o) => sum + o.orderValue, 0);
        const totalPaid = paymentsForDealer.reduce((sum, p) => sum + p.amount, 0);

        return { ordersWithValues, unlinkedPayments, totalOrderValue, totalPaid, totalBalance: totalOrderValue - totalPaid };
    }, [dealerOrders, paymentsForDealer, products]);

    const sortedPayments = useMemo(() => {
        return [...paymentsForDealer].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [paymentsForDealer]);

    const getStatusChip = (status: StockStatus | OrderStatus | BookingStatus) => {
        let colorClasses = '';
        switch (status) {
            case StockStatus.Available:
            case OrderStatus.Approved:
            case BookingStatus.Delivered:
            case OrderStatus.Delivered:
                colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'; break;
            case StockStatus.Reserved:
            case OrderStatus.Pending:
            case BookingStatus.Pending:
                colorClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'; break;
            case StockStatus.Sold:
            case OrderStatus.Rejected:
            case BookingStatus.Cancelled:
                colorClasses = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'; break;
            case OrderStatus.PartiallyApproved:
            case BookingStatus.Allocated:
                colorClasses = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'; break;
            case OrderStatus.Dispatched:
            case OrderStatus.InTransit:
                colorClasses = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'; break;
            default: colorClasses = 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>{status}</span>;
    };
    
    const handleRecalculate = async () => {
        if (!dealerId) return;
        setIsRecalculating(true);
        await recalculateReputation(dealerId);
        setIsRecalculating(false);
    }
    
    const getReputationScoreUI = (score: number) => {
        let colorClasses = '';
        if (score >= 8.0) colorClasses = 'text-green-600';
        else if (score >= 5.0) colorClasses = 'text-yellow-600';
        else colorClasses = 'text-red-600';
        return <div className={`flex items-center text-xl font-bold ${colorClasses}`}><StarIcon className="w-5 h-5 mr-1.5 fill-current" /><span>{score.toFixed(1)}</span></div>;
    };
    
    const handleSendMessage = () => {
        if (!dealer) return;
        const dealerUser = users.find(u => u.dealerId === dealer._id);
        if (dealerUser) {
            setActivePage('Messages', { recipientId: dealerUser._id });
        } else {
            showToast('Could not find a user associated with this dealer.', 'error');
        }
    };
    
    const openProof = (imageUrl: string) => {
        const w = window.open('about:blank');
        if (w) {
            const img = new Image();
            img.src = imageUrl;
            img.style.maxWidth = '100%';
            w.document.write(img.outerHTML);
            w.document.title = "Proof of Payment";
        }
    };

    const renderContent = () => {
        switch(activeTab) {
            case 'overview':
                return (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm space-y-8 animate-fade-in">
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 text-lg">Dealer Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><strong className="text-slate-700 dark:text-slate-300">Owner:</strong> <span className="text-slate-600 dark:text-slate-400">{dealer?.ownerName}</span></div>
                                <div><strong className="text-slate-700 dark:text-slate-300">Email:</strong> <span className="text-slate-600 dark:text-slate-400">{dealer?.email}</span></div>
                                <div className="flex items-center">
                                    <strong className="mr-2 text-slate-700 dark:text-slate-300">Phone:</strong>
                                    <a
                                        href={createWhatsAppLink(dealer?.phone || '')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                        aria-label="Chat on WhatsApp"
                                    >
                                        <span className="hover:underline">{dealer?.phone}</span>
                                        <Tooltip content="Chat on WhatsApp">
                                            <WhatsAppIcon className="w-5 h-5 ml-2 text-green-600 dark:text-green-400" />
                                        </Tooltip>
                                    </a>
                                </div>
                                <div><strong className="text-slate-700 dark:text-slate-300">City:</strong> <span className="text-slate-600 dark:text-slate-400">{dealer?.city}</span></div>
                                <div><strong className="text-slate-700 dark:text-slate-300">Status:</strong> {dealer?.registrationApproved ? getStatusChip('Approved' as any) : getStatusChip('Pending' as any)}</div>
                                <div className="flex items-center gap-4">
                                    <strong className="text-slate-700 dark:text-slate-300">Reputation:</strong>
                                    {getReputationScoreUI(dealer?.reputationScore ?? 0)}
                                    {canRecalculateReputation &&
                                        <Tooltip content="Recalculate score based on recent performance">
                                            <button onClick={handleRecalculate} disabled={isRecalculating} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-primary disabled:opacity-50 no-print">
                                                <RefreshCwIcon className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                                            </button>
                                        </Tooltip>
                                    }
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 text-lg border-t border-slate-200 dark:border-slate-700 pt-6">Key Performance Metrics</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <p className="font-medium text-slate-500 dark:text-slate-400">Total Sales Revenue</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">Rs. {stats.totalRevenue.toLocaleString()}</p>
                                </div>
                                 <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <p className="font-medium text-slate-500 dark:text-slate-400">Total Bookings (All Time)</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.totalBookings}</p>
                                </div>
                                 <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <p className="font-medium text-slate-500 dark:text-slate-400">Current Stock Value</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">Rs. {stats.totalStockValue.toLocaleString()}</p>
                                </div>
                                 <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <p className="font-medium text-slate-500 dark:text-slate-400">Pending Stock Orders</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.pendingOrders}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'stock': return (
                <div className="animate-fade-in">
                    <PaginatedTable
                        columns={[
                            { label: 'VIN', key: 'vin' },
                            { label: 'Product', key: 'productName' },
                            { label: 'Status', key: 'status' },
                            { label: 'Assigned Date', key: 'assignedAt' }
                        ]}
                        data={enrichedStock}
                        renderRow={(item) => (
                            <>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-slate-600 dark:text-slate-400">{item.vin}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{item.productName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(item.status)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(item.assignedAt).toLocaleDateString()}</td>
                            </>
                        )}
                    />
                </div>
            );
            case 'orders': return (
                <div className="animate-fade-in">
                    <PaginatedTable
                        columns={[
                            { label: 'Date', key: 'requestTimestamp' },
                            { label: 'Status', key: 'status' },
                            { label: 'Requested Units', key: 'totalRequested' },
                            { label: 'Approved Units', key: 'totalApproved' }
                        ]}
                        data={enrichedOrders}
                        renderRow={(item) => (
                            <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(item.requestTimestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(item.status)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{item.totalRequested}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-100">{item.totalApproved}</td>
                            </>
                        )}
                    />
                </div>
            );
             case 'bookings': return (
                 <div className="animate-fade-in">
                    <PaginatedTable
                        columns={[
                            { label: 'Date', key: 'bookingTimestamp' },
                            { label: 'Customer', key: 'customerName' },
                            { label: 'Product', key: 'productName' },
                            { label: 'Status', key: 'status' }
                        ]}
                        data={enrichedBookings}
                        renderRow={(item) => (
                            <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(item.bookingTimestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{item.customerName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.productName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(item.status)}</td>
                            </>
                        )}
                    />
                </div>
             );
            case 'financials':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">Financial Summary</h3>
                                <button onClick={() => setPaymentModalOpen(true)} className="py-2 px-4 text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary no-print">Record Payment</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                                <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Approved Order Value</p><p className="text-2xl font-bold text-slate-800 dark:text-slate-100">Rs. {financialSummary.totalOrderValue.toLocaleString()}</p></div>
                                <div><p className="text-sm text-slate-500 dark:text-slate-400">Total Payments Received</p><p className="text-2xl font-bold text-green-600">Rs. {financialSummary.totalPaid.toLocaleString()}</p></div>
                                <div><p className="text-sm text-slate-500 dark:text-slate-400">Overall Balance</p><p className={`text-2xl font-bold ${financialSummary.totalBalance > 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>Rs. {financialSummary.totalBalance.toLocaleString()}</p></div>
                            </div>
                        </div>
                        
                        <h4 className="font-medium text-slate-700 dark:text-slate-300 mt-4">Order Payment Status</h4>
                        <PaginatedTable 
                            columns={[
                                { label: 'Order Date', key: 'order.requestTimestamp' },
                                { label: 'Order Value', key: 'orderValue' },
                                { label: 'Amount Paid', key: 'paidAmount' },
                                { label: 'Balance', key: 'balance' }
                            ]} 
                            data={financialSummary.ordersWithValues} 
                            renderRow={(item) => (
                             <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(item.order.requestTimestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">Rs. {item.orderValue.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">Rs. {item.paidAmount.toLocaleString()}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${item.balance > 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>Rs. {item.balance.toLocaleString()}</td>
                            </>
                         )} />
                         
                         <h4 className="font-medium text-slate-700 dark:text-slate-300 mt-6">Recent Payments List</h4>
                         <PaginatedTable 
                            columns={[
                                { label: 'Date', key: 'timestamp' },
                                { label: 'Amount', key: 'amount' },
                                { label: 'Type', key: 'type' },
                                { label: 'Reference', key: 'reference' },
                                { label: 'Proof', key: 'proofOfPayment' } // Not really sortable by image content but fits pattern
                            ]}
                            data={sortedPayments} 
                            renderRow={(payment) => (
                             <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(payment.timestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">Rs. {payment.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm capitalize text-slate-600 dark:text-slate-300">{payment.type.replace('_', ' ')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.reference || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 no-print">
                                    {payment.proofOfPayment ? (
                                        <Tooltip content="View Proof">
                                            <button onClick={() => openProof(payment.proofOfPayment!)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 dark:hover:bg-slate-700 rounded">
                                                <ImageIcon className="w-5 h-5"/>
                                            </button>
                                        </Tooltip>
                                    ) : '-'}
                                </td>
                            </>
                         )} />
                    </div>
                );
        }
    }

    if (isLoading) return <SkeletonLoader type="table" rows={8} />;
    
    if (!dealer) {
        return <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg">
            <h2 className="text-xl font-bold text-red-600">Dealer Not Found</h2>
            <p className="text-slate-500 mt-2">The requested dealer could not be found.</p>
            <button onClick={() => setActivePage('Dealers')} className="mt-4 flex items-center mx-auto text-sm font-semibold text-primary hover:underline">
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Return to Dealers List
            </button>
        </div>;
    }

    return (
        <div id="dealer-detail-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <button onClick={() => setActivePage('Dealers')} className="flex items-center text-sm font-semibold text-primary hover:underline">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Dealers List
                </button>
                <div className="flex items-center gap-2">
                    <Tooltip content="Send a message">
                        <button onClick={handleSendMessage} className="flex items-center justify-center p-2 border border-slate-300 dark:border-slate-600 shadow-sm rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <MessageSquareIcon />
                        </button>
                    </Tooltip>
                    <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('dealer-detail-content')} className="flex items-center justify-center p-2 border border-slate-300 dark:border-slate-600 shadow-sm rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <PrintIcon />
                        </button>
                    </Tooltip>
                </div>
            </div>

            <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{dealer.name}</h2>
                <p className="text-slate-500 dark:text-slate-400">{dealer.city}</p>
            </div>

            <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Dealer Summary: {dealer.name}</h1>
                <p className="text-sm text-slate-600 mb-4">Report for: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} | Generated on: {new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
                <StatCard title="Total Stock Value" value={`Rs. ${stats.totalStockValue.toLocaleString()}`} icon={<BoxIcon />} color="bg-blue-500" onClick={() => setActiveTab('stock')} />
                <StatCard title="Pending Orders" value={stats.pendingOrders.toString()} icon={<CheckSquareIcon />} color="bg-yellow-500" onClick={() => setActiveTab('orders')} />
                <StatCard title="Total Bookings" value={stats.totalBookings.toString()} icon={<CalendarIcon />} color="bg-green-500" onClick={() => setActiveTab('bookings')} />
                <StatCard title="Total Sales Revenue" value={`Rs. ${stats.totalRevenue.toLocaleString()}`} icon={<DollarSignIcon />} color="bg-indigo-500" onClick={() => setActiveTab('financials')} />
            </div>

            <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-700 no-print overflow-x-auto">
                {(['overview', 'stock', 'orders', 'bookings', 'financials'] as DetailTab[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-semibold capitalize transition-colors shrink-0 ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-slate-200'}`}>
                        {tab}
                    </button>
                ))}
            </div>

             <div className="mt-4">
                {renderContent()}
            </div>
             <DealerPaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setPaymentModalOpen(false)} 
                dealerId={dealerId} 
                showToast={showToast}
            />
        </div>
    );
};

const PaginatedTable: React.FC<{
    columns: TableColumn[];
    data: any[];
    renderRow: (item: any) => React.ReactNode;
}> = ({ columns, data, renderRow }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const sortedData = useMemo(() => {
        if (!sortConfig || !sortConfig.key) return data;
        
        return [...data].sort((a, b) => {
            // Support nested keys like 'order.requestTimestamp'
            const getValue = (obj: any, path: string) => path.split('.').reduce((o, k) => (o || {})[k], obj);
            
            let aValue = getValue(a, sortConfig.key);
            let bValue = getValue(b, sortConfig.key);

            // Handle strings (case-insensitive)
            if (typeof aValue === 'string') aValue = aValue.toLowerCase();
            if (typeof bValue === 'string') bValue = bValue.toLowerCase();

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(sortedData, 10);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className={`px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${col.className || ''}`}>
                                    {col.key ? (
                                        <button 
                                            onClick={() => requestSort(col.key!)} 
                                            className="flex items-center space-x-1 group hover:text-slate-700 dark:hover:text-slate-200"
                                        >
                                            <span>{col.label}</span>
                                            {sortConfig?.key === col.key ? (
                                                sortConfig.direction === 'asc' ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>
                                            ) : (
                                                <ChevronsUpDownIcon className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                            )}
                                        </button>
                                    ) : (
                                        col.label
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {paginatedData.length > 0 ? paginatedData.map((item, index) => <tr key={item._id || index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">{renderRow(item)}</tr>) : (
                             <tr><td colSpan={columns.length}><EmptyState icon={<BoxIcon/>} title="No Data Available" message="There are no records to display for this section." /></td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
        </div>
    );
};

export default DealerDetail;