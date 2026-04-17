import React, { useState, useMemo } from 'react';
import { useData } from '../../hooks/useData.ts';
import type { StockOrder, StockOrderItem } from '../../types.ts';
import { OrderStatus } from '../../types.ts';
import OrderReviewModal from '../modals/OrderReviewModal.tsx';
import Tooltip from '../shared/Tooltip.tsx';
import { ChevronDownIcon, ChevronUpIcon, ClipboardListIcon, TruckIcon, PrintIcon, WhatsAppIcon, XCircleIcon } from '../icons/Icons.tsx';
import SkeletonLoader from '../shared/SkeletonLoader.tsx';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { printElementById, createWhatsAppLink } from '../../utils/print.ts';
import ConfirmModal from '../modals/ConfirmModal.tsx';

const StockOrders: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { stockOrders, dealers, products, isLoading, dispatchStockOrder, dealerPayments } = useData();
    const { canApproveStockOrder, canDispatchOrders } = usePermissions();
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<StockOrder | null>(null);
    const [orderToDispatch, setOrderToDispatch] = useState<StockOrder | null>(null);
    const [isDispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
    const [dealerFilter, setDealerFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    const findVariant = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) return { product, variant };
        }
        return null;
    };

    const getOrderPaymentStatus = (order: StockOrder) => {
        if (order.status === OrderStatus.Rejected || order.status === OrderStatus.Pending) {
            return { status: 'N/A', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' };
        }

        const orderValue = order.approvedItems?.reduce((sum, item) => {
            const found = findVariant(item.variantId);
            const variant = found?.variant;
            return sum + (item.approvedQuantity * (variant?.price || 0));
        }, 0) ?? 0;

        if (orderValue === 0) {
            return { status: 'N/A', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' };
        }

        const totalPaid = dealerPayments
            .filter(p => p.stockOrderId === order._id)
            .reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid >= orderValue) {
            return { status: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
        }
        if (totalPaid > 0) {
            return { status: 'Partially Paid', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
        }
        return { status: 'Unpaid', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
    };

    const filteredOrders = useMemo(() => {
        let orders = stockOrders;

        if (filterStatus !== 'all') orders = orders.filter(o => o.status === filterStatus);
        if (dealerFilter !== 'all') orders = orders.filter(o => o.dealerId === dealerFilter);
        
        if (startDate) orders = orders.filter(o => new Date(o.requestTimestamp) >= new Date(startDate));
        if (endDate) orders = orders.filter(o => new Date(o.requestTimestamp) <= new Date(endDate));
        
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            orders = orders.filter(order => {
                const dealer = dealers.find(d => d._id === order.dealerId);
                if (dealer?.name.toLowerCase().includes(lowercasedQuery)) return true;
                if (order.trackingNumber && order.trackingNumber.toLowerCase().includes(lowercasedQuery)) return true;

                return order.items.some(item => {
                    const product = products.find(p => p._id === item.productId);
                    if (product) {
                        if (product.modelName.toLowerCase().includes(lowercasedQuery)) return true;
                        const variant = product.variants.find(v => v._id === item.variantId);
                        if (variant?.name.toLowerCase().includes(lowercasedQuery)) return true;
                    }
                    return false;
                });
            });
        }

        return orders.sort((a, b) => new Date(b.requestTimestamp).getTime() - new Date(a.requestTimestamp).getTime());
    }, [stockOrders, filterStatus, dealerFilter, startDate, endDate, searchQuery, dealers, products]);
    
    const { paginatedData, currentPage, totalPages, nextPage, prevPage, setCurrentPage } = usePagination(filteredOrders, 10);

    const handleReview = (order: StockOrder) => {
        setSelectedOrder(order);
        setModalOpen(true);
    };
    
    const handleDispatchClick = (order: StockOrder) => {
        setOrderToDispatch(order);
        setTrackingNumber('');
        setDispatchModalOpen(true);
    };

    const handleDispatchConfirm = async () => {
        if (!orderToDispatch) return;
        try {
            await dispatchStockOrder(orderToDispatch._id, trackingNumber);
            showToast('Order marked as dispatched!', 'success');
        } catch {
            showToast('Failed to dispatch order.', 'error');
        }
        setDispatchModalOpen(false);
        setOrderToDispatch(null);
        setTrackingNumber('');
    };
    
    const handlePrintOrder = (orderId: string) => {
        const elementId = `order-details-${orderId}`;
        printElementById(elementId);
    };


    const handleToggleRow = (orderId: string) => {
        setExpandedOrderId(prev => (prev === orderId ? null : orderId));
    };

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.Pending: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case OrderStatus.Approved: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case OrderStatus.PartiallyApproved: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case OrderStatus.Rejected: return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            case OrderStatus.Dispatched: return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300';
            case OrderStatus.InTransit: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
            case OrderStatus.Delivered: return 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };
    
    const handleClearFilters = () => {
        setSearchQuery('');
        setFilterStatus('all');
        setDealerFilter('all');
        setStartDate('');
        setEndDate('');
    };

    if (isLoading) {
        return <SkeletonLoader type="table" rows={5} />;
    }

    return (
        <div id="stock-orders-page-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Stock Orders</h2>
                <Tooltip content="Print Current View">
                    <button onClick={() => printElementById('stock-orders-page-content')} className="flex items-center justify-center space-x-2 py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <PrintIcon />
                        <span>Print</span>
                    </button>
                </Tooltip>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto flex-wrap">
                    <div className="relative w-full md:w-64">
                        <input type="text" placeholder="Search dealer, product, tracking..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm w-full bg-white dark:bg-slate-700 focus:ring-primary focus:border-primary" />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-4 w-full md:w-auto">
                        <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">Status:</label>
                            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as OrderStatus | 'all'); setCurrentPage(1); }} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm w-full md:w-32 bg-white dark:bg-slate-700">
                                <option value="all">All</option>{Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">Dealer:</label>
                            <select value={dealerFilter} onChange={(e) => { setDealerFilter(e.target.value); setCurrentPage(1); }} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm w-full md:w-40 bg-white dark:bg-slate-700">
                                <option value="all">All</option>{dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-4 w-full md:w-auto">
                        <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">From:</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm w-full md:w-auto bg-white dark:bg-slate-700" />
                        </div>
                        <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">To:</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm w-full md:w-auto bg-white dark:bg-slate-700" />
                        </div>
                    </div>
                </div>
                 <button onClick={handleClearFilters} className="w-full xl:w-auto py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0">
                    Clear Filters
                </button>
            </div>

            <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Stock Orders Report</h1>
                <p className="text-sm text-slate-600 mb-4">
                    Filter: Status ({filterStatus}) | Generated on: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-2 py-3 w-12 no-print"></th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dealer</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Request Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tracking</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Items (Req/App)</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {paginatedData.length > 0 ? paginatedData.map(order => {
                                const dealer = dealers.find(d => d._id === order.dealerId);
                                const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
                                const approvedQty = order.approvedItems?.reduce((sum, item) => sum + item.approvedQuantity, 0) ?? 0;
                                const isExpanded = expandedOrderId === order._id;
                                const prefilledMessage = `Hi ${dealer?.name}, regarding Stock Order #${order._id.slice(-6)}.`;
                                const canBeDispatched = (order.status === OrderStatus.Approved || order.status === OrderStatus.PartiallyApproved) && canDispatchOrders;
                                const paymentStatus = getOrderPaymentStatus(order);

                                return (
                                    <React.Fragment key={order._id}>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-2 py-4 whitespace-nowrap text-center no-print">
                                                <Tooltip content={isExpanded ? 'Hide Details' : 'Show Details'}>
                                                    <button onClick={() => handleToggleRow(order._id)} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                                        {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                                    </button>
                                                </Tooltip>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{dealer?.name}</div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400">{dealer?.city}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {new Date(order.requestTimestamp).toLocaleString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize w-max ${getStatusColor(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize w-max ${paymentStatus.color}`}>
                                                        {paymentStatus.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 font-mono">
                                                {order.trackingNumber || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Tooltip content={order.items.map(item => `${item.quantity}x ${findVariant(item.variantId)?.variant?.name || 'Unknown'}`).join(', ')}>
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{totalQty} / {order.status !== OrderStatus.Pending ? approvedQty : 'N/A'}</span>
                                                </Tooltip>
                                                {order.status !== OrderStatus.Pending && 
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Approved: {approvedQty} units</p>
                                                }
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium no-print">
                                                <div className="flex items-center space-x-2">
                                                    {order.status === OrderStatus.Pending && canApproveStockOrder && (
                                                        <button onClick={() => handleReview(order)} className="py-2 px-4 border border-transparent shadow-sm rounded-md text-white bg-primary hover:bg-secondary text-xs font-medium">
                                                            Review
                                                        </button>
                                                    )}
                                                    {canBeDispatched && (
                                                        <button onClick={() => handleDispatchClick(order)} className="flex items-center space-x-2 py-2 px-3 border border-transparent shadow-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 text-xs font-medium">
                                                            <TruckIcon className="w-4 h-4" />
                                                            <span>Dispatch</span>
                                                        </button>
                                                    )}
                                                     <Tooltip content={`Chat with ${dealer?.name} on WhatsApp`}>
                                                        <a 
                                                            href={createWhatsAppLink(dealer?.phone || '', prefilledMessage)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"
                                                        >
                                                            <WhatsAppIcon />
                                                        </a>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={7} className="p-0">
                                                     <div id={`order-details-${order._id}`} className="p-4 mx-4 my-2 border-l-4 border-accent bg-slate-100 dark:bg-slate-700 rounded-r-md">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div className="flex flex-col">
                                                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Order Details</h4>
                                                                {order.trackingNumber && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tracking ID: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{order.trackingNumber}</span></p>}
                                                            </div>
                                                            <div className="flex items-center space-x-4">
                                                                {order.proofOfPaymentUrl && (
                                                                    <a href={order.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:underline no-print">
                                                                        <ClipboardListIcon className="w-4 h-4" />
                                                                        <span>View Payment Proof</span>
                                                                    </a>
                                                                )}
                                                                <button onClick={() => handlePrintOrder(order._id)} className="flex items-center space-x-1 text-xs font-semibold text-primary hover:underline no-print">
                                                                    <PrintIcon className="w-4 h-4" />
                                                                    <span>Print</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full">
                                                                <thead className="bg-slate-200 dark:bg-slate-600">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Product</th>
                                                                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Requested</th>
                                                                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Approved</th>
                                                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Unit Price</th>
                                                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">Subtotal</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white dark:bg-slate-700/50">
                                                                    {order.items.map((item: StockOrderItem) => {
                                                                        const found = findVariant(item.variantId);
                                                                        const variant = found?.variant;
                                                                        const approvedItem = order.approvedItems?.find(ai => ai.variantId === item.variantId);
                                                                        const isPending = order.status === OrderStatus.Pending;
                                                                        const quantityToCalculate = isPending ? item.quantity : (approvedItem?.approvedQuantity ?? 0);
                                                                        const subtotal = (variant?.price ?? 0) * quantityToCalculate;
                                                                        return (
                                                                            <tr key={item.variantId}>
                                                                                <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-200">{variant?.name || 'Unknown Variant'}</td>
                                                                                <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 text-center">{item.quantity}</td>
                                                                                <td className={`px-4 py-2 text-sm font-bold text-center`}>
                                                                                    {isPending ? 'Pending' : quantityToCalculate}
                                                                                </td>
                                                                                <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 text-right">
                                                                                    {variant ? `Rs. ${variant.price.toLocaleString()}` : 'N/A'}
                                                                                </td>
                                                                                <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-200 font-semibold text-right">
                                                                                    {`Rs. ${subtotal.toLocaleString()}`}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                                <tfoot className="bg-slate-50 dark:bg-slate-800">
                                                                    <tr>
                                                                        <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                            {order.status === OrderStatus.Pending ? 'Estimated Total:' : 'Actual Total:'}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right text-sm font-bold text-primary">
                                                                            Rs. {order.items.reduce((sum, item) => {
                                                                                const found = findVariant(item.variantId);
                                                                                const variant = found?.variant;
                                                                                const approvedItem = order.approvedItems?.find(ai => ai.variantId === item.variantId);
                                                                                const qty = order.status === OrderStatus.Pending ? item.quantity : (approvedItem?.approvedQuantity ?? 0);
                                                                                return sum + (qty * (variant?.price ?? 0));
                                                                            }, 0).toLocaleString()}
                                                                        </td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7}>
                                        <EmptyState
                                            icon={<ClipboardListIcon className="w-10 h-10" />}
                                            title="No Orders Found"
                                            message={
                                                searchQuery || filterStatus !== 'all' || dealerFilter !== 'all'
                                                ? "Your filters didn't match any orders. Try a different query." 
                                                : "There are no stock orders in the system yet."
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
            </div>

            <OrderReviewModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                order={selectedOrder}
                showToast={showToast}
            />

            {/* Custom Modal for Dispatching with Tracking Number */}
            {isDispatchModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={() => setDispatchModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center mb-4 text-indigo-600 dark:text-indigo-400">
                                <TruckIcon className="w-6 h-6 mr-2" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Dispatch Order</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                Enter the tracking number for order <span className="font-mono font-bold">#{orderToDispatch?._id.slice(-6)}</span>. This will notify the dealer.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tracking Number / ID</label>
                                <input 
                                    type="text" 
                                    value={trackingNumber} 
                                    onChange={(e) => setTrackingNumber(e.target.value)} 
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g. TRK-123456789"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 flex justify-end space-x-3 rounded-b-lg">
                            <button
                                onClick={() => setDispatchModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDispatchConfirm}
                                disabled={!trackingNumber.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Dispatch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockOrders;