import React, { useState, useMemo } from 'react';
import type { StockOrder } from '../../types.ts';
import { OrderStatus } from '../../types.ts';
import OrderReviewModal from '../modals/OrderReviewModal.tsx';
import Tooltip from '../shared/Tooltip.tsx';
import { ClockIcon, CheckCircleIcon, XCircleIcon, PrintIcon } from '../icons/Icons.tsx';
import { useData } from '../../hooks/useData.ts';
import { printElementById } from '../../utils/print.ts';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';

type PriorityMethod = 'reputation' | 'fcfs';

const Approvals: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { stockOrders, dealers } = useData();
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<StockOrder | null>(null);
    const [priorityMethod, setPriorityMethod] = useState<PriorityMethod>('reputation');

    const pendingRequests = useMemo(() => {
        const pending = stockOrders.filter(req => req.status === OrderStatus.Pending);
        
        return pending.sort((a, b) => {
            if (priorityMethod === 'fcfs') {
                return new Date(a.requestTimestamp).getTime() - new Date(b.requestTimestamp).getTime();
            }
            // Default to reputation-based
            const dealerA = dealers.find(d => d._id === a.dealerId);
            const dealerB = dealers.find(d => d._id === b.dealerId);
            return (dealerB?.reputationScore ?? 0) - (dealerA?.reputationScore ?? 0);
        });

    }, [stockOrders, priorityMethod, dealers]);

    const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(pendingRequests, 10);

    const handleReview = (request: StockOrder) => {
        setSelectedRequest(request);
        setModalOpen(true);
    };
    
    return (
        <div id="approvals-page-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800">Allocation Approvals</h2>
                <Tooltip content="Print Current View">
                    <button onClick={() => printElementById('approvals-page-content')} className="flex items-center justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        <PrintIcon />
                    </button>
                </Tooltip>
            </div>
            
            <div className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between border border-slate-200 no-print">
                <div>
                    <span className="text-sm font-semibold text-slate-600 mr-2">Prioritize Queue By:</span>
                    <button
                        onClick={() => setPriorityMethod('reputation')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                            priorityMethod === 'reputation' ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Reputation Based
                    </button>
                     <button
                        onClick={() => setPriorityMethod('fcfs')}
                        className={`ml-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                            priorityMethod === 'fcfs' ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        First Come, First Serve
                    </button>
                </div>
                 <p className="text-sm text-slate-500">
                    Showing {pendingRequests.length} pending requests.
                 </p>
            </div>

            <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Pending Allocation Requests</h1>
                <p className="text-sm text-slate-600 mb-4">Generated on: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dealer</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reputation</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Request Details</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {paginatedData.length > 0 ? paginatedData.map(request => {
                                const dealer = dealers.find(d => d._id === request.dealerId);
                                const totalItems = request.items.length;
                                const totalQty = request.items.reduce((sum, item) => sum + item.quantity, 0);
                                return (
                                    <tr key={request._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">{dealer?.name}</div>
                                            <div className="text-sm text-slate-500">{dealer?.city}</div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-700 font-bold">{dealer?.reputationScore.toFixed(1)}</td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{totalItems} Models, {totalQty} Units</td>
                                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{new Date(request.requestTimestamp).toLocaleDateString()}</td>
                                        <td className="px-6 py-5 whitespace-nowrap no-print">
                                            <button onClick={() => handleReview(request)} className="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-500">No pending requests.</td>
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
                order={selectedRequest}
                showToast={showToast}
            />
        </div>
    );
};

export default Approvals;