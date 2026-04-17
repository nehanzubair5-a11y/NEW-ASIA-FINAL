import React, { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Use StockOrder and related types instead of the deprecated Allocation types.
import type { StockOrder, ApprovedOrderItem, StockOrderItem, Recommendation } from '../../types.ts';
// FIX: Use OrderStatus enum instead of the deprecated AllocationStatus.
import { OrderStatus } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { AlertTriangleIcon, FileTextIcon } from '../icons/Icons.tsx';
import Spinner from '../shared/Spinner.tsx';
// FIX: Standard default import
import StockOrderInvoiceModal from './StockOrderInvoiceModal.tsx';

interface OrderReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    // FIX: Use StockOrder type for the order prop.
    order: StockOrder | null;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const OrderReviewModal: React.FC<OrderReviewModalProps> = ({ isOpen, onClose, order: request, showToast }) => {
    const { dealers, products, stock, processAllocationRequest, getRecommendationForItem, dealerPayments } = useData();
    const { settings } = useAppContext();
    const [approvedQuantities, setApprovedQuantities] = useState<Record<string, number>>({});
    const [isVisible, setIsVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

    const dealer = useMemo(() => dealers.find(d => d._id === request?.dealerId), [dealers, request]);

    const getRecommendation = useCallback((item: StockOrderItem): Recommendation => {
        if (!dealer) return { type: 'Review', reason: 'Dealer not found.' };
        return getRecommendationForItem(item, dealer._id);
    }, [getRecommendationForItem, dealer]);

    const getRecommendedQty = useCallback((item: StockOrderItem): number => {
        const recommendation = getRecommendation(item);
        const centralStockCount = stock.filter(s => s.variantId === item.variantId && s.dealerId === null).length;
        
        switch (recommendation.type) {
            case 'Approve':
                return item.quantity;
            case 'Reject':
                return 0;
            case 'Review':
                if (centralStockCount < item.quantity) {
                    return centralStockCount;
                }
                return recommendation.mlQuantity ?? item.quantity;
            default:
                return item.quantity;
        }
    }, [getRecommendation, stock]);


    useEffect(() => {
        if (isOpen && request) {
            setIsVisible(true);
            const initialQuantities = request.items.reduce((acc, item) => {
                acc[item.variantId] = getRecommendedQty(item);
                return acc;
            }, {} as Record<string, number>);
            setApprovedQuantities(initialQuantities);
        } else {
            setTimeout(() => setIsVisible(false), 200);
        }
    }, [request, isOpen, getRecommendedQty]);

    const financialSummary = useMemo(() => {
        if (!request) return { orderValue: 0, totalPaid: 0, balance: 0, subTotal: 0, taxAmount: 0 };

        const subTotal = request.items.reduce((sum, item) => {
            const variant = products.flatMap(p => p.variants).find(v => v._id === item.variantId);
            const approvedQty = approvedQuantities[item.variantId] || 0;
            return sum + (approvedQty * (variant?.price || 0));
        }, 0);

        const taxRate = settings.taxRate || 0;
        const taxAmount = (subTotal * taxRate) / 100;
        const orderValue = subTotal + taxAmount;

        const totalPaid = dealerPayments
            .filter(p => p.stockOrderId === request._id)
            .reduce((sum, p) => sum + p.amount, 0);

        return {
            subTotal,
            taxAmount,
            orderValue,
            totalPaid,
            balance: orderValue - totalPaid,
        };
    }, [request, approvedQuantities, dealerPayments, products, settings.taxRate]);


    const RecommendationChip: React.FC<{ rec: Recommendation }> = ({ rec }) => {
        let colorClasses = '';
        if (rec.type === 'Review' && rec.reason.includes('Limited Stock')) {
            colorClasses = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        } else {
            switch (rec.type) {
                case 'Approve': colorClasses = 'bg-green-100 text-green-800 border-green-200'; break;
                case 'Reject': colorClasses = 'bg-red-100 text-red-800 border-red-200'; break;
                case 'Review': colorClasses = 'bg-blue-100 text-blue-800 border-blue-200'; break;
            }
        }
        
        return (
            <div className={`p-2 rounded-lg border ${colorClasses}`}>
                <p className="font-bold text-sm mb-1">{rec.type}</p>
                <p className="text-xs text-slate-600">{rec.reason}</p>
                
                {((rec.mlReasoningFactors && rec.mlReasoningFactors.length > 0) || rec.mlQuantity !== undefined) && (
                    <div className="pt-2 mt-2 border-t border-current border-opacity-20 space-y-2">
                        {rec.mlReasoningFactors && rec.mlReasoningFactors.length > 0 && (
                            <div>
                                 <p className="text-xs font-semibold text-slate-700">ML Reasoning:</p>
                                 <div className="flex flex-wrap gap-1 mt-1">
                                    {rec.mlReasoningFactors.map(factor => (
                                        <span key={factor} className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md">
                                            {factor}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {rec.mlQuantity !== undefined && (
                            <p className="text-xs font-semibold text-slate-700">
                                ML Suggestion: <span className="text-primary font-bold">Approve {rec.mlQuantity} units</span>
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const handleQuantityChange = (variantId: string, value: string, max: number) => {
        if (value === '') {
            setApprovedQuantities(prev => ({ ...prev, [variantId]: 0 }));
            return;
        }
        
        const num = parseInt(value, 10);
        
        if (!isNaN(num)) {
            const clampedValue = Math.max(0, Math.min(max, num));
            setApprovedQuantities(prev => ({ ...prev, [variantId]: clampedValue }));
        }
    };
    
    const QuickActionButton: React.FC<{ item: StockOrder['items'][0] }> = ({ item }) => {
        const recommendedQty = getRecommendedQty(item);
        const currentQty = approvedQuantities[item.variantId];

        if (recommendedQty === currentQty) {
             return <span className="text-xs text-slate-400">Recommended</span>;
        }

        const centralStockCount = stock.filter(s => s.variantId === item.variantId && s.dealerId === null).length;
        const isStockLimited = centralStockCount < item.quantity;

        let buttonText = "Use Recommendation";
        if (isStockLimited) buttonText = `Approve Available (${centralStockCount})`;
        else if (getRecommendation(item).mlQuantity !== undefined) buttonText = `Use ML Suggestion (${recommendedQty})`;

        return (
            <button 
                onClick={() => setApprovedQuantities(prev => ({...prev, [item.variantId]: recommendedQty}))}
                className="text-xs font-semibold text-primary hover:underline"
            >
                {buttonText}
            </button>
        );
    };

    const handleSubmit = async (status: OrderStatus) => {
        if (!request) return;
        setIsProcessing(true);

        try {
            const totalRequested = request.items.reduce((sum: number, item: StockOrderItem) => sum + item.quantity, 0);
            const totalApproved = Object.values(approvedQuantities).reduce((sum: number, qty: number) => sum + qty, 0);
            
            let finalStatus = status;
            if (status !== OrderStatus.Rejected) {
                if (totalApproved === 0) finalStatus = OrderStatus.Rejected;
                else if (totalApproved < totalRequested) finalStatus = OrderStatus.PartiallyApproved;
                else finalStatus = OrderStatus.Approved;
            }
            
            const approvedItems: ApprovedOrderItem[] = request.items.map(item => ({
                ...item,
                approvedQuantity: approvedQuantities[item.variantId] || 0,
            }));

            await processAllocationRequest(request._id, approvedItems, finalStatus);
            showToast(`Request has been ${finalStatus.toLowerCase()}.`, 'success');
        } catch (err) {
            showToast('Failed to process order.', 'error');
        } finally {
            setIsProcessing(false);
            onClose();
        }
    };

    if (!isVisible || !request) return null;

    return (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start sm:items-center p-0 sm:p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
                <div className={`bg-white dark:bg-slate-800 rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-6xl flex flex-col transform transition-transform duration-200 ${isOpen ? 'scale-100' : 'scale-95'}`} onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sm:rounded-t-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Review Allocation Request</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">For {dealer?.name} ({dealer?.city}) - Reputation: {dealer?.reputationScore.toFixed(1)}</p>
                        </div>
                        <button onClick={() => setIsInvoiceModalOpen(true)} className="flex items-center space-x-2 py-2 px-3 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <FileTextIcon className="w-4 h-4" />
                            <span>View Pro-forma Invoice</span>
                        </button>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                            <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Payment Status</h4>
                            {financialSummary.balance > 0 && (
                                <div className="p-3 mb-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 flex items-start gap-3">
                                    <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">Outstanding Balance</p>
                                        <p className="text-sm">This order has an outstanding balance. Please confirm payment before dispatching goods.</p>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400">Subtotal</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">Rs. {financialSummary.subTotal.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400">Tax ({settings.taxRate || 0}%)</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">Rs. {financialSummary.taxAmount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400">Total Value</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">Rs. {financialSummary.orderValue.toLocaleString()}</p>
                                </div>
                                 <div>
                                    <p className="text-slate-500 dark:text-slate-400">Payments</p>
                                    <p className="font-bold text-green-600 text-lg">Rs. {financialSummary.totalPaid.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400">Balance</p>
                                    <p className={`font-bold text-lg ${financialSummary.balance > 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
                                        Rs. {financialSummary.balance.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400">Proof</p>
                                    {request.proofOfPaymentUrl ? (
                                        <a href={request.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium flex items-center space-x-1 mt-1">
                                            <FileTextIcon className="w-4 h-4" />
                                            <span>Receipt</span>
                                        </a>
                                    ) : (
                                        <p className="text-slate-500 dark:text-slate-400 italic mt-1">None</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Product</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Req. Qty</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Stock</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase w-1/4">System Recommendation</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Approve Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                        {request.items.map(item => {
                                            const product = products.find(p => p._id === item.productId);
                                            const variant = product?.variants.find(v => v._id === item.variantId);
                                            const recommendation = getRecommendation(item);
                                            const centralStockCount = stock.filter(s => s.variantId === item.variantId && s.dealerId === null).length;
                                            const isStockLimited = centralStockCount < item.quantity;
                                            const recommendedQty = getRecommendedQty(item);
                                            const isRecommended = approvedQuantities[item.variantId] === recommendedQty;
                                            
                                            return (
                                                <tr key={item.variantId}>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{product?.brand} {product?.modelName}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{variant?.name}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{item.quantity}</td>
                                                    <td className={`px-4 py-3 text-sm font-semibold ${isStockLimited ? 'text-yellow-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        <div className="flex items-center">
                                                             {isStockLimited && <AlertTriangleIcon className="w-4 h-4 mr-1.5" />}
                                                             <span>{centralStockCount}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3"><RecommendationChip rec={recommendation} /></td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center space-x-3">
                                                            <input
                                                                type="number"
                                                                value={approvedQuantities[item.variantId] || 0}
                                                                onChange={(e) => handleQuantityChange(item.variantId, e.target.value, item.quantity)}
                                                                min="0"
                                                                max={item.quantity}
                                                                className={`w-24 p-2 border rounded-md shadow-sm text-sm focus:ring-2 bg-white dark:bg-slate-700 focus:border-primary ${isRecommended ? 'border-primary/50' : 'border-slate-300 dark:border-slate-600'}`}
                                                            />
                                                            <QuickActionButton item={item} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-100 dark:bg-slate-700/50 text-right space-x-3 rounded-b-lg flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={onClose} disabled={isProcessing} className="py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">Cancel</button>
                         <button type="button" onClick={() => handleSubmit(OrderStatus.Rejected)} disabled={isProcessing} className="w-28 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400">
                            {isProcessing ? <Spinner/> : 'Reject All'}
                        </button>
                        <button type="button" onClick={() => handleSubmit(OrderStatus.Approved)} disabled={isProcessing} className="w-44 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                            {isProcessing ? <Spinner/> : 'Confirm & Approve'}
                        </button>
                    </div>
                </div>
            </div>
            <StockOrderInvoiceModal 
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                order={request}
                approvedQuantities={approvedQuantities}
            />
        </>
    );
};

export default OrderReviewModal;