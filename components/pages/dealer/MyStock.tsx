import React, { useMemo, useState } from 'react';
import { StockStatus, StockItem } from '../../../types.ts';
import { useAuth } from '../../../hooks/useAuth.ts';
import EmptyState from '../../shared/EmptyState.tsx';
import { ArchiveIcon, PrintIcon } from '../../icons/Icons.tsx';
import { useData } from '../../../hooks/useData.ts';
import Tooltip from '../../shared/Tooltip.tsx';
import { printElementById } from '../../../utils/print.ts';
import StockItemDetailModal from '../../modals/StockItemDetailModal.tsx';
import usePagination from '../../../hooks/usePagination.ts';
import Pagination from '../../shared/Pagination.tsx';

const MyStock: React.FC = () => {
    const { user } = useAuth();
    const { stock, products } = useData();
    
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
    const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    const findProductInfo = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) {
                return { product, variant };
            }
        }
        return { product: null, variant: null };
    };

    const filteredStock = useMemo(() => {
        let dealerStock = stock.filter(s => s.dealerId === user?.dealerId);

        if (statusFilter !== 'all') {
            dealerStock = dealerStock.filter(s => s.status === statusFilter);
        }
        
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            dealerStock = dealerStock.filter(item => {
                const { product, variant } = findProductInfo(item.variantId);
                const productName = `${product?.brand} ${product?.modelName} ${variant?.name}`.toLowerCase();
                return item.vin.toLowerCase().includes(lowercasedQuery) || productName.includes(lowercasedQuery);
            });
        }

        return dealerStock;
    }, [user, stock, products, statusFilter, searchQuery]);

    const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(filteredStock, 10);
    
    const handleViewDetails = (item: StockItem) => {
        setSelectedStockItem(item);
        setDetailModalOpen(true);
    };

    const getStatusColor = (status: StockStatus) => {
        switch (status) {
            case StockStatus.Available: return 'bg-green-100 text-green-800';
            case StockStatus.Reserved: return 'bg-yellow-100 text-yellow-800';
            case StockStatus.Sold: return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div id="my-stock-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-gray-800">My Inventory Stock</h2>
                <Tooltip content="Print Current View">
                    <button onClick={() => printElementById('my-stock-content')} className="flex items-center justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                        <PrintIcon />
                    </button>
                </Tooltip>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full">
                     <div className="relative w-full md:w-64">
                        <input type="text" placeholder="Search VIN or product..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 pr-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm w-full" />
                         <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg></div>
                    </div>
                    <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                        <label className="text-sm font-medium text-slate-600 shrink-0">Status:</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-slate-300 rounded-md shadow-sm text-sm w-full md:w-auto">
                            <option value="all">All Statuses</option>
                            {Object.values(StockStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VIN</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned At</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                             {paginatedData.length > 0 ? paginatedData.map(entry => {
                                const { product, variant } = findProductInfo(entry.variantId);
                                return (
                                <tr key={entry._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleViewDetails(entry)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{entry.vin}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{product?.brand} {product?.modelName}</div>
                                        <div className="text-sm text-gray-500">{variant?.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusColor(entry.status)}`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(entry.assignedAt).toLocaleDateString()}</td>
                                </tr>
                            )}) : (
                                <tr>
                                    <td colSpan={4}>
                                        <EmptyState 
                                            icon={<ArchiveIcon className="w-10 h-10" />}
                                            title="No Stock Found"
                                            message={searchQuery || statusFilter !== 'all' ? "No stock items match your filters." : "Your inventory is empty. Place a stock order to get vehicles."}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
            </div>
             <StockItemDetailModal 
                isOpen={isDetailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                item={selectedStockItem}
            />
        </div>
    );
};

export default MyStock;