import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../hooks/useAppContext.ts';
import { useAuth } from '../../../hooks/useAuth.ts';
import { OrderStatus, StockOrderItem, StockOrder } from '../../../types.ts';
import Tooltip from '../../shared/Tooltip.tsx';
import { PlusIcon, ChevronDownIcon, ChevronUpIcon, ClipboardListIcon, PrintIcon, CheckCircleIcon } from '../../icons/Icons.tsx';
import NewOrderModal from '../../modals/NewOrderModal.tsx';
import EmptyState from '../../shared/EmptyState.tsx';
import { useData } from '../../../hooks/useData.ts';
import { usePermissions } from '../../../hooks/usePermissions.ts';
import { printElementById } from '../../../utils/print.ts';
import usePagination from '../../../hooks/usePagination.ts';
import Pagination from '../../shared/Pagination.tsx';
import ConfirmModal from '../../modals/ConfirmModal.tsx';
import UploadPaymentProofModal from '../../modals/UploadPaymentProofModal.tsx';
import Spinner from '../../shared/Spinner.tsx';

const MyStockOrders: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { user } = useAuth();
    const { stockOrders, products, dealerPayments, confirmOrderReceipt, cancelStockOrder, updateStockOrder } = useData();
    const { canCreateOwnStockOrder, canConfirmReceipt } = usePermissions();
    const [isModalOpen, setModalOpen] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [orderToConfirm, setOrderToConfirm] = useState<StockOrder | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<StockOrder | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [orderToUpload, setOrderToUpload] = useState<StockOrder | null>(null);

    const handleUploadPaymentProof = async (orderId: string, base64Image: string) => {
        const order = stockOrders.find(o => o._id === orderId);
        if (order) {
            await updateStockOrder({ ...order, proofOfPaymentUrl: base64Image });
        }
    };

    const findVariant = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) return variant;
        }
        return null;
    };
    
    const getOrderPaymentStatus = (order: StockOrder) => {
        if (order.status === OrderStatus.Rejected || order.status === OrderStatus.Pending) {
            return { status: 'N/A', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' };
        }

        const orderValue = order.approvedItems?.reduce((sum, item) => {
            const variant = findVariant(item.variantId);
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
        let orders = stockOrders
            .filter(req => req.dealerId === user?.dealerId)
            .sort((a, b) => new Date(b.requestTimestamp).getTime() - new Date(a.requestTimestamp).getTime());

        if (statusFilter !== 'all') {
            orders = orders.filter(o => o.status === statusFilter);
        }

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            orders = orders.filter(order => 
                order.items.some(item => {
                    const variant = findVariant(item.variantId);
                    return variant?.name.toLowerCase().includes(lowercasedQuery);
                })
            );
        }
        
        return orders;
    }, [user, stockOrders, products, statusFilter, searchQuery]);

    const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(filteredOrders, 10);

    const handleToggleRow = (orderId: string) => {
        setExpandedOrderId(prev => (prev === orderId ? null : orderId));
    };
    
    const handlePrintOrder = (orderId: string) => {
        const elementId = `my-order-details-${orderId}`;
        printElementById(elementId);
    };

    const handleConfirmClick = (order: StockOrder) => {
        setOrderToConfirm(order);
        setIsConfirmOpen(true);
    };

    const handleConfirmReceipt = async () => {
        if (!orderToConfirm) return;
        setIsConfirming(true);
        try {
            await confirmOrderReceipt(orderToConfirm._id);
            showToast("Order receipt confirmed successfully!", "success");
        } catch (error) {
            showToast("Failed to confirm receipt.", "error");
        } finally {
            setIsConfirming(false);
            setOrderToConfirm(null);
            setIsConfirmOpen(false);
        }
    };

    const handleCancelClick = (order: StockOrder) => {
        setOrderToCancel(order);
        setIsCancelConfirmOpen(true);
    };

    const handleCancelConfirm = async () => {
        if (!orderToCancel) return;
        setIsCancelling(true);
        try {
            await cancelStockOrder(orderToCancel._id);
            showToast("Order cancelled successfully!", "success");
        } catch (error) {
            showToast("Failed to cancel order.", "error");
        } finally {
            setIsCancelling(false);
            setOrderToCancel(null);
            setIsCancelConfirmOpen(false);
        }
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

    return (
        <div id="my-stock-orders-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Stock Orders</h2>
                <div className="flex items-center space-x-2">
                    <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('my-stock-orders-content')} className="flex items-center justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <PrintIcon />
                        </button>
                    </Tooltip>
                    {canCreateOwnStockOrder && (
                        <button onClick={() => setModalOpen(true)} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                            <PlusIcon />
                            <span>Create New Order</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full">
                     <div className="relative w-full md:w-64">
                        <input type="text" placeholder="Search by product..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700 w-full" />
                         <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg></div>
                    </div>
                    <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">Status:</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700 w-full md:w-auto">
                            <option value="all">All Statuses</option>
                            {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">My Stock Orders</h1>
                <p className="text-sm text-slate-600 mb-4">Generated on: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-2 py-3 w-12 no-print"></th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Request Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Items (Req/App)</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {paginatedData.length > 0 ? paginatedData.map(order => {
                                const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
                                const approvedQty = order.approvedItems?.reduce((sum, item) => sum + item.approvedQuantity, 0) ?? 0;
                                const isExpanded = expandedOrderId === order._id;
                                const paymentStatus = getOrderPaymentStatus(order);
                                const canConfirm = canConfirmReceipt && (order.status === OrderStatus.Dispatched || order.status === OrderStatus.InTransit);
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
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${paymentStatus.color}`}>
                                                    {paymentStatus.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Tooltip content={order.items.map(item => `${item.quantity}x ${findVariant(item.variantId)?.name || 'Unknown'}`).join(', ')}>
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{totalQty} / {order.status !== OrderStatus.Pending ? approvedQty : 'N/A'}</span>
                                                </Tooltip>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap no-print">
                                                <div className="flex space-x-2">
                                                    {canConfirm && (
                                                        <button onClick={() => handleConfirmClick(order)} className="flex items-center space-x-2 py-2 px-3 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                            <span>Confirm Receipt</span>
                                                        </button>
                                                    )}
                                                    {order.status === OrderStatus.Pending && (
                                                        <button onClick={() => handleCancelClick(order)} className="flex items-center space-x-2 py-2 px-3 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                                                            <span>Cancel</span>
                                                        </button>
                                                    )}
                                                    {(order.status === OrderStatus.Approved || order.status === OrderStatus.PartiallyApproved) && paymentStatus.status !== 'Paid' && (
                                                        <button onClick={() => { setOrderToUpload(order); setIsUploadModalOpen(true); }} className="flex items-center space-x-2 py-2 px-3 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                                            <ClipboardListIcon className="w-4 h-4" />
                                                            <span>Upload Payment Proof</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={6} className="p-0">
                                                    <div id={`my-order-details-${order._id}`} className="p-4 mx-4 my-2 border-l-4 border-accent bg-slate-100 dark:bg-slate-700 rounded-r-md">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-4">Order Details</h4>
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
                                                                    const variant = findVariant(item.variantId);
                                                                    const approvedItem = order.approvedItems?.find(ai => ai.variantId === item.variantId);
                                                                    const isPending = order.status === OrderStatus.Pending;
                                                                    const quantityToCalculate = isPending ? item.quantity : (approvedItem?.approvedQuantity ?? 0);
                                                                    const subtotal = (variant?.price ?? 0) * quantityToCalculate;

                                                                    return (
                                                                        <tr key={item.variantId}>
                                                                            <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-200">{variant?.name || 'Unknown Variant'}</td>
                                                                            <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 text-center">{item.quantity}</td>
                                                                            <td className={`px-4 py-2 text-sm font-bold text-center ${!isPending && quantityToCalculate < item.quantity ? 'text-blue-600' : 'text-slate-800 dark:text-slate-200'}`}>
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
                                                                            const variant = findVariant(item.variantId);
                                                                            const approvedItem = order.approvedItems?.find(ai => ai.variantId === item.variantId);
                                                                            const qty = order.status === OrderStatus.Pending ? item.quantity : (approvedItem?.approvedQuantity ?? 0);
                                                                            return sum + (qty * (variant?.price ?? 0));
                                                                        }, 0).toLocaleString()}
                                                                    </td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6}>
                                        <EmptyState
                                            icon={<ClipboardListIcon className="w-10 h-10" />}
                                            title="No Orders Yet"
                                            message="Click the button above to create your first stock order."
                                             action={
                                                <button onClick={() => setModalOpen(true)} className="flex items-center space-x-2 mx-auto py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                                                    <PlusIcon />
                                                    <span>Create First Order</span>
                                                </button>
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
            <NewOrderModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} showToast={showToast} />
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmReceipt}
                title="Confirm Order Receipt"
                message={`Are you sure you want to confirm receipt for order #${orderToConfirm?._id.slice(-6)}? This will add the approved items to your inventory.`}
            />
            <ConfirmModal
                isOpen={isCancelConfirmOpen}
                onClose={() => setIsCancelConfirmOpen(false)}
                onConfirm={handleCancelConfirm}
                title="Cancel Stock Order"
                message={`Are you sure you want to cancel order #${orderToCancel?._id.slice(-6)}? This action cannot be undone.`}
            />
            <UploadPaymentProofModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                order={orderToUpload}
                onUpload={handleUploadPaymentProof}
                showToast={showToast}
            />
        </div>
    );
};

export default MyStockOrders;