import React, { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Use StockOrder and related types instead of the deprecated Allocation types.
import type { StockOrder, ApprovedOrderItem, StockOrderItem, Recommendation } from '../../types.ts';
// FIX: Use OrderStatus enum instead of the deprecated AllocationStatus.
import { OrderStatus } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import { AlertTriangleIcon } from '../icons/Icons.tsx';
import Spinner from '../shared/Spinner.tsx';

interface ApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    // FIX: Use StockOrder type for the request prop.
    request: StockOrder | null;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ isOpen, onClose, request, showToast }) => {
    // FIX: Use useData hook to get data and functions from DataContext.
    const { dealers, products, stock, processAllocationRequest, getRecommendationForItem } = useData();
    const [approvedQuantities, setApprovedQuantities] = useState<Record<string, number>>({});
    const [isVisible, setIsVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

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
            <div className={`p-2 rounded-md border ${colorClasses}`}>
                <p className="font-bold text-sm">{rec.type}</p>
                <p className="text-xs">{rec.reason}</p>
                {rec.mlQuantity !== undefined && (
                    <p className="text-xs font-semibold mt-1 pt-1 border-t border-current border-opacity-30">
                        ML Suggestion: Approve {rec.mlQuantity} units
                    </p>
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
        } catch (error) {
            showToast('Failed to process the request.', 'error');
        } finally {
            setIsProcessing(false);
            onClose();
        }
    };

    if (!isVisible || !request) return null;

    return (
         <div className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start sm:items-center p-0 sm:p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
            <div className={`bg-slate-50 rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-6xl flex flex-col transform transition-transform duration-200 ${isOpen ? 'scale-100' : 'scale-95'}`} onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 bg-white sm:rounded-t-lg">
                    <h3 className="text-xl font-semibold text-slate-800">Review Allocation Request</h3>
                    <p className="text-sm text-slate-500">For {dealer?.name} ({dealer?.city}) - Reputation: {dealer?.reputationScore.toFixed(1)}</p>
                </div>
                <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-100/80">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Req. Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Stock</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-1/4">System Recommendation</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Approve Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
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
                                                    <p className="text-sm font-medium text-slate-800">{product?.brand} {product?.modelName}</p>
                                                    <p className="text-xs text-slate-500">{variant?.name}</p>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-700">{item.quantity}</td>
                                                <td className={`px-4 py-3 text-sm font-semibold ${isStockLimited ? 'text-yellow-600' : 'text-slate-700'}`}>
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
                                                            className={`w-24 p-2 border rounded-md shadow-sm text-sm focus:ring-2 focus:border-primary ${isRecommended ? 'border-primary/50' : 'border-slate-300'}`}
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
                <div className="px-6 py-4 bg-slate-100 text-right space-x-3 rounded-b-lg flex-shrink-0 border-t border-slate-200">
                    <button type="button" onClick={onClose} disabled={isProcessing} className="py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={() => handleSubmit(OrderStatus.Rejected)} disabled={isProcessing} className="w-28 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400">
                        {isProcessing ? <Spinner/> : 'Reject All'}
                    </button>
                    <button type="button" onClick={() => handleSubmit(OrderStatus.Approved)} disabled={isProcessing} className="w-44 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                        {isProcessing ? <Spinner/> : 'Confirm & Approve'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApprovalModal;