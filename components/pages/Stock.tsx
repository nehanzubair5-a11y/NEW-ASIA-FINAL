import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StockStatus, StockItem, Product } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import { ArchiveIcon, PrintIcon, FileSearchIcon, ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon, PlusIcon, ListIcon, GridIcon, XCircleIcon } from '../icons/Icons.tsx';
import Tooltip from '../shared/Tooltip.tsx';
import { printElementById } from '../../utils/print.ts';
import StockItemDetailModal from '../modals/StockItemDetailModal.tsx';
import StockModal from '../modals/StockModal.tsx';

interface StockProps {
    stockView: 'central' | 'dealer';
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    initialState?: any;
    onInitialStateConsumed: () => void;
}

type SortableKey = 'vin' | 'productName' | 'holderName' | 'status' | 'assignedAt' | 'price';
type SortDirection = 'ascending' | 'descending';
type ViewMode = 'list' | 'grid';

const StockCard: React.FC<{ item: any; onSelect: (id: string, checked: boolean) => void; isSelected: boolean; onViewDetails: (item: StockItem) => void; }> = ({ item, onSelect, isSelected, onViewDetails }) => {
    const getStatusColor = (status: StockStatus) => {
        switch (status) {
            case StockStatus.Available: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200';
            case StockStatus.Reserved: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200';
            case StockStatus.Sold: return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-200';
        }
    };
    
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700 transition-all relative ${isSelected ? 'border-primary shadow-lg' : 'border-slate-200 hover:shadow-md'}`}>
            <div className="absolute top-2 right-2 no-print">
                 <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary bg-transparent"
                    checked={isSelected}
                    onChange={(e) => onSelect(item._id, e.target.checked)}
                />
            </div>
            <div className="p-4 cursor-pointer" onClick={() => onViewDetails(item)}>
                <p className="font-mono text-sm font-bold text-primary truncate">{item.vin}</p>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-1 truncate">{item.productName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.holderName}</p>
                <div className="flex justify-between items-end mt-3">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full capitalize border ${getStatusColor(item.status)}`}>
                        {item.status}
                    </span>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Rs. </span>
                        {item.price.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    )
}


const Stock: React.FC<StockProps> = ({ stockView, showToast, initialState, onInitialStateConsumed }) => {
    const { stock, products, dealers, updateStockStatusBulk, addStock } = useData();
    
    const [categoryFilter, setCategoryFilter] = useState<string>('All'); // This will be modelName
    const [variantFilter, setVariantFilter] = useState<string>('all'); // This will be variant name like NA-70cc
    
    const [filterStatus, setFilterStatus] = useState<StockStatus | 'all'>('all');
    const [filterDealer, setFilterDealer] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [selectedStock, setSelectedStock] = useState<string[]>([]);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: SortDirection } | null>({ key: 'assignedAt', direction: 'descending' });
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    useEffect(() => {
        if (initialState?.status) {
            setFilterStatus(initialState.status);
            onInitialStateConsumed();
        }
    }, [initialState, onInitialStateConsumed]);
    
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timerId);
    }, [searchQuery]);

    const findProductInfo = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) return { product, variant };
        }
        return { product: null, variant: null };
    };

    const enrichedStock = useMemo(() => {
        return stock.map(item => {
             const { product, variant } = findProductInfo(item.variantId);
             const holderName = dealers.find(d => d._id === item.dealerId)?.name || 'Company Stock';
             return { 
                ...item, 
                productName: `${product?.modelName || ''} (${variant?.name || ''} - ${variant?.color || ''})`,
                productId: product?._id,
                productModelName: product?.modelName,
                variantName: variant?.name,
                holderName: holderName,
                price: variant?.price || 0,
            };
        });
    }, [stock, products, dealers]);

    const productCategories = useMemo(() => ['All', ...new Set(products.map(p => p.modelName))], [products]);
    
    const variantsForCategory = useMemo(() => {
        if (categoryFilter === 'all' || categoryFilter === 'All') return [];
        const product = products.find(p => p.modelName === categoryFilter);
        return product ? [...new Set(product.variants.map(v => v.name))] : [];
    }, [categoryFilter, products]);

    useEffect(() => {
        setVariantFilter('all');
    }, [categoryFilter]);

    const filteredStock = useMemo(() => {
        const lowercasedQuery = debouncedSearchQuery.toLowerCase();
        
        return enrichedStock.filter(item => {
            const viewMatch = stockView === 'central' ? item.dealerId === null : item.dealerId !== null;
            if (!viewMatch) return false;
            
            const categoryMatch = categoryFilter === 'All' || item.productModelName === categoryFilter;
            if (!categoryMatch) return false;

            const variantMatch = variantFilter === 'all' || item.variantName === variantFilter;
            if (!variantMatch) return false;

            const statusMatch = filterStatus === 'all' || item.status === filterStatus;
            const dealerMatch = stockView === 'central' || filterDealer === 'all' || item.dealerId === filterDealer;
            
            const itemDate = new Date(item.assignedAt);
            const startMatch = !startDate || itemDate >= new Date(startDate);
            const endMatch = !endDate || itemDate <= new Date(endDate);

            if (!statusMatch || !dealerMatch || !startMatch || !endMatch) return false;

            if (lowercasedQuery) {
                const vinMatch = item.vin.toLowerCase().includes(lowercasedQuery);
                const productMatchQuery = item.productName.toLowerCase().includes(lowercasedQuery);
                const holderMatch = item.holderName.toLowerCase().includes(lowercasedQuery);
                return vinMatch || productMatchQuery || holderMatch;
            }
            return true;
        });
    }, [enrichedStock, stockView, categoryFilter, variantFilter, filterStatus, filterDealer, startDate, endDate, debouncedSearchQuery, products]);

    const sortedStock = useMemo(() => {
        let sortableItems = [...filteredStock];
        if (sortConfig !== null && viewMode === 'list') {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredStock, sortConfig, viewMode]);

    const { paginatedData, currentPage, totalPages, nextPage, prevPage, setCurrentPage } = usePagination(sortedStock, viewMode === 'grid' ? 12 : 10);

    const summaryStats = useMemo(() => ({
        count: filteredStock.length,
        value: filteredStock.reduce((sum, item) => sum + item.price, 0)
    }), [filteredStock]);

    useEffect(() => {
        setSelectedStock([]);
        setCurrentPage(1);
    }, [stockView, categoryFilter, variantFilter, filterStatus, filterDealer, startDate, endDate, debouncedSearchQuery, sortConfig, viewMode, setCurrentPage]);
    
    const handleViewDetails = (item: StockItem) => {
        setSelectedStockItem(item);
        setDetailModalOpen(true);
    };
    
    const handleSaveStockItem = async (stockData: Omit<StockItem, '_id' | 'assignedAt'>) => {
        try {
            await addStock(stockData);
            showToast('New stock item added!', 'success');
            setAddModalOpen(false);
        } catch {
            showToast('Failed to add stock item.', 'error');
        }
    };

    const handleClearFilters = () => {
        setFilterStatus('all');
        setFilterDealer('all');
        setCategoryFilter('All');
        setVariantFilter('all');
        setStartDate('');
        setEndDate('');
        setSearchQuery('');
    };

    const requestSort = (key: SortableKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortIndicator = ({ columnKey }: { columnKey: SortableKey }) => {
        if (!sortConfig || sortConfig.key !== columnKey) return <ChevronsUpDownIcon className="w-4 h-4 text-slate-400" />;
        if (sortConfig.direction === 'ascending') return <ChevronUpIcon className="w-4 h-4" />;
        return <ChevronDownIcon className="w-4 h-4" />;
    };

    const handleSelectStock = (stockId: string, isSelected: boolean) => {
        if (isSelected) setSelectedStock(prev => [...prev, stockId]);
        else setSelectedStock(prev => prev.filter(id => id !== stockId));
    };
    
    const handleBulkStatusChange = async (status: StockStatus) => {
        if (selectedStock.length === 0) return;
        await updateStockStatusBulk(selectedStock, status);
        showToast(`${selectedStock.length} items updated to '${status}'.`, 'success');
        setSelectedStock([]);
    };

    const getStatusColor = (status: StockStatus) => {
        switch (status) {
            case StockStatus.Available: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case StockStatus.Reserved: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case StockStatus.Sold: return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    return (
        <div id="stock-page-content" className="space-y-6">
            <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                        {stockView === 'central' ? 'Company Stock' : 'Dealer Stock'}
                    </h2>
                    <div className="flex items-center space-x-2 no-print">
                         <div className="flex items-center space-x-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
                            <Tooltip content="List View"><button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-primary shadow' : 'text-slate-500'}`}><ListIcon/></button></Tooltip>
                            <Tooltip content="Grid View"><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 text-primary shadow' : 'text-slate-500'}`}><GridIcon/></button></Tooltip>
                        </div>
                        {stockView === 'central' && (
                            <button onClick={() => setAddModalOpen(true)} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                                <PlusIcon /><span>Add Stock</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-4 no-print">
                    <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-x-auto">
                        {productCategories.map(cat => <button key={cat} onClick={() => setCategoryFilter(cat)} className={`w-full text-center px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${categoryFilter === cat ? 'bg-white dark:bg-slate-600 shadow-sm text-primary' : 'text-slate-500 dark:text-slate-300 hover:bg-white/50'}`}>{cat}</button>)}
                    </div>
                    {variantsForCategory.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto animate-fade-in pb-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Models:</span>
                            <button 
                                onClick={() => setVariantFilter('all')} 
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${variantFilter === 'all' 
                                    ? 'bg-primary text-white shadow' 
                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                All
                            </button>
                            {variantsForCategory.map(variantName => (
                                <button 
                                    key={variantName} 
                                    onClick={() => setVariantFilter(variantName)} 
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${variantFilter === variantName 
                                        ? 'bg-primary text-white shadow' 
                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {variantName}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 no-print">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-wrap w-full xl:w-auto">
                        <div className="relative w-full md:w-auto">
                            <input id="stock-search" type="text" placeholder="Search VIN, product..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full md:w-64 p-2 pl-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700" />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg></div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                             <div className="w-full sm:w-auto">
                                 <label htmlFor="status-filter" className="sr-only">Status</label>
                                 <select id="status-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700">
                                     <option value="all">All Statuses</option>
                                     {Object.values(StockStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                            </div>
                            {stockView === 'dealer' && (
                                 <div className="w-full sm:w-auto">
                                    <label htmlFor="dealer-filter" className="sr-only">Dealer</label>
                                    <select id="dealer-filter" value={filterDealer} onChange={(e) => setFilterDealer(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700">
                                        <option value="all">All Dealers</option>
                                        {dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <div className="w-full sm:w-auto">
                                <label htmlFor="start-date" className="sr-only">Start Date</label>
                                <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700" placeholder="From" />
                            </div>
                             <div className="w-full sm:w-auto">
                                <label htmlFor="end-date" className="sr-only">End Date</label>
                                <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700" placeholder="To" />
                            </div>
                        </div>
                    </div>
                     <button onClick={handleClearFilters} className="w-full xl:w-auto py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0">Clear Filters</button>
                </div>

                 {selectedStock.length > 0 && (
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg shadow-sm flex items-center justify-between animate-fade-in no-print sticky top-6 z-10">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedStock.length} item(s) selected</span>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Set status to:</span>
                            <button onClick={() => handleBulkStatusChange(StockStatus.Available)} className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Available</button>
                            <button onClick={() => handleBulkStatusChange(StockStatus.Reserved)} className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700">Reserved</button>
                            <button onClick={() => handleBulkStatusChange(StockStatus.Sold)} className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700">Sold</button>
                        </div>
                    </div>
                )}
                {paginatedData.length > 0 ? (
                    viewMode === 'list' ? (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-3 w-12 no-print"><input type="checkbox" onChange={(e) => setSelectedStock(e.target.checked ? paginatedData.map(i => i._id) : [])} className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-primary" /></th>
                                        {(['vin', 'productName', 'price', 'holderName', 'status', 'assignedAt'] as SortableKey[]).map(key => (<th key={key} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><button onClick={() => requestSort(key)} className="flex items-center space-x-1 group"><span>{key.replace('Name', ' ').replace('At', '')}</span> <SortIndicator columnKey={key} /></button></th>))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {paginatedData.map(item => (<tr key={item._id} className={`transition-colors ${selectedStock.includes(item._id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                        <td className="px-4 py-4 no-print"><input type="checkbox" checked={selectedStock.includes(item._id)} onChange={(e) => handleSelectStock(item._id, e.target.checked)} className="h-4 w-4 rounded" /></td>
                                        <td className="px-6 py-4 cursor-pointer" onClick={() => handleViewDetails(item)}><span className="font-mono text-slate-600 dark:text-slate-400">{item.vin}</span></td>
                                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{item.productName}</td>
                                        <td className="px-6 py-4">Rs. {item.price.toLocaleString()}</td>
                                        <td className="px-6 py-4">{item.holderName}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full capitalize ${getStatusColor(item.status)}`}>{item.status}</span></td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(item.assignedAt).toLocaleDateString()}</td>
                                    </tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {paginatedData.map(item => (<StockCard key={item._id} item={item} onSelect={handleSelectStock} isSelected={selectedStock.includes(item._id)} onViewDetails={handleViewDetails} />))}
                    </div>)) : (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm"><EmptyState icon={<ArchiveIcon className="w-10 h-10" />} title="No Stock Items Found" message="Your search or filter criteria did not match any stock items." /></div>
                )}
                <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />

            <StockItemDetailModal isOpen={isDetailModalOpen} onClose={() => setDetailModalOpen(false)} item={selectedStockItem} />
            <StockModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onSave={handleSaveStockItem} showToast={showToast} />
        </div>
    );
};

export default Stock;