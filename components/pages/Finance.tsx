import React, { useState, useMemo } from 'react';
import { useData } from '../../hooks/useData.ts';
import { Page, DealerPayment } from '../../types.ts';
import StatCard from '../shared/StatCard.tsx';
import { DollarSignIcon, UsersIcon, PrintIcon, ImageIcon } from '../icons/Icons.tsx';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import { printElementById } from '../../utils/print.ts';
import Tooltip from '../shared/Tooltip.tsx';
import DealerPaymentModal from '../modals/DealerPaymentModal.tsx';

const Finance: React.FC<{
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}> = ({ showToast }) => {
    const { dealerPayments, dealers } = useData();
    const [dealerFilter, setDealerFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedDealerId, setSelectedDealerId] = useState<string | undefined>(undefined);

    const paymentsWithDetails = useMemo(() => {
        return dealerPayments.map(p => ({
            ...p,
            dealerName: dealers.find(d => d._id === p.dealerId)?.name || 'Unknown Dealer',
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [dealerPayments, dealers]);

    const filteredPayments = useMemo(() => {
        return paymentsWithDetails.filter(p => {
            if (dealerFilter !== 'all' && p.dealerId !== dealerFilter) return false;
            const paymentDate = new Date(p.timestamp);
            if (startDate && paymentDate < new Date(startDate)) return false;
            if (endDate && paymentDate > new Date(endDate)) return false;
            return true;
        });
    }, [paymentsWithDetails, dealerFilter, startDate, endDate]);

    const summaryStats = useMemo(() => {
        const totalReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const last30Days = filteredPayments.filter(p => new Date(p.timestamp) >= thirtyDaysAgo).reduce((sum, p) => sum + p.amount, 0);

        return { totalReceived, last30Days };
    }, [filteredPayments]);
    
    const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(filteredPayments, 15);

    const handleOpenPaymentModal = (dealerId?: string) => {
        setSelectedDealerId(dealerId);
        setPaymentModalOpen(true);
    };

    const handleClearFilters = () => {
        setDealerFilter('all');
        setStartDate('');
        setEndDate('');
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

    return (
        <div id="finance-page-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800">Finance Ledger</h2>
                <div className="flex items-center space-x-2">
                    <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('finance-page-content')} className="flex items-center justify-center p-2 border border-slate-300 shadow-sm rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            <PrintIcon />
                        </button>
                    </Tooltip>
                    <button onClick={() => handleOpenPaymentModal()} className="py-2 px-4 text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                        Record a Payment
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Payments (Filtered)" value={`Rs. ${summaryStats.totalReceived.toLocaleString()}`} icon={<DollarSignIcon />} color="bg-green-500" />
                <StatCard title="Payments (Last 30d)" value={`Rs. ${summaryStats.last30Days.toLocaleString()}`} icon={<DollarSignIcon />} color="bg-blue-500" />
                <StatCard title="Total Dealers" value={dealers.length.toString()} icon={<UsersIcon />} color="bg-indigo-500" />
            </div>

             <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-stretch gap-4 no-print">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-wrap">
                    <div className="flex items-center">
                        <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">Dealer:</label>
                        <select value={dealerFilter} onChange={e => setDealerFilter(e.target.value)} className="p-2 border border-slate-300 rounded-md shadow-sm text-sm w-full">
                            <option value="all">All</option>{dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center">
                        <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">From:</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-slate-300 rounded-md shadow-sm text-sm w-full" />
                    </div>
                    <div className="flex items-center">
                        <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">To:</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-slate-300 rounded-md shadow-sm text-sm w-full" />
                    </div>
                </div>
                 <button onClick={handleClearFilters} className="py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors shrink-0">
                    Clear Filters
                </button>
            </div>


            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Dealer</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount (Rs)</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reference / Linked Order</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase no-print">Proof</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {paginatedData.length > 0 ? paginatedData.map(p => (
                                <tr key={p._id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(p.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{p.dealerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{p.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{p.type.replace('_', ' ')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                        {p.stockOrderId ? `Order #${p.stockOrderId.slice(-6)}` : p.reference || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 no-print">
                                        {p.proofOfPayment ? (
                                            <Tooltip content="View Proof of Payment">
                                                <button onClick={() => openProof(p.proofOfPayment!)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded">
                                                    <ImageIcon className="w-5 h-5"/>
                                                </button>
                                            </Tooltip>
                                        ) : <span className="text-xs text-gray-400">None</span>}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6}>
                                        <EmptyState icon={<DollarSignIcon className="w-12 h-12" />} title="No Payments Found" message="No payments match your current filter criteria." />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
            </div>
            {isPaymentModalOpen &&
                <DealerPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setPaymentModalOpen(false)}
                    dealerId={selectedDealerId || dealers[0]?._id}
                    showToast={showToast}
                />
            }
        </div>
    );
};

export default Finance;