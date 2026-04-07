import React, { useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth.ts';
// FIX: Use OrderStatus enum instead of the deprecated AllocationStatus.
import { OrderStatus } from '../../../types.ts';
import Tooltip from '../../shared/Tooltip.tsx';
import { useData } from '../../../hooks/useData.ts';

const MyStockRequests: React.FC = () => {
    const { user } = useAuth();
    // FIX: Use useData hook to get data from DataContext.
    const { stockOrders, products } = useData();

    const myRequests = useMemo(() => {
        return stockOrders
            .filter(req => req.dealerId === user?.dealerId)
            .sort((a, b) => new Date(b.requestTimestamp).getTime() - new Date(a.requestTimestamp).getTime());
    }, [user, stockOrders]);

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.Pending: return 'bg-yellow-100 text-yellow-800';
            case OrderStatus.Approved: return 'bg-green-100 text-green-800';
            case OrderStatus.PartiallyApproved: return 'bg-blue-100 text-blue-800';
            case OrderStatus.Rejected: return 'bg-red-100 text-red-800';
            case OrderStatus.Dispatched: return 'bg-indigo-100 text-indigo-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const findVariant = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) return variant;
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">My Stock Requests</h2>
                {/* Future: <button className="..."><PlusIcon /> New Request</button> */}
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Request Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Requested Items</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved Items</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {myRequests.length > 0 ? myRequests.map(request => {
                                const totalQty = request.items.reduce((sum, item) => sum + item.quantity, 0);
                                const approvedQty = request.approvedItems?.reduce((sum, item) => sum + item.approvedQuantity, 0) ?? 0;
                                return (
                                    <tr key={request._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{new Date(request.requestTimestamp).toLocaleDateString()}</td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusColor(request.status)}`}>
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <Tooltip content={request.items.map(item => `${item.quantity}x ${findVariant(item.variantId)?.name || 'Unknown'}`).join(', ')}>
                                                <span className="text-sm text-slate-700">{request.items.length} Models, {totalQty} Units</span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            {request.status !== OrderStatus.Pending ? (
                                                <Tooltip content={request.approvedItems?.map(item => `${item.approvedQuantity}x ${findVariant(item.variantId)?.name || 'Unknown'}`).join(', ')}>
                                                    <span className="text-sm font-semibold text-slate-900">{approvedQty} / {totalQty} Units</span>
                                                </Tooltip>
                                            ) : (
                                                <span className="text-sm text-slate-400">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-slate-500">You haven't made any stock requests yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MyStockRequests;