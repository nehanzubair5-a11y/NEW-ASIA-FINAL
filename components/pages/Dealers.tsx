import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Dealer, Page } from '../../types.ts';
import { PlusIcon, EditIcon, UsersIcon, StarIcon, PrintIcon, ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon, CheckCircleIcon, XCircleIcon, WhatsAppIcon } from '../icons/Icons.tsx';
import DealerModal from '../modals/DealerModal.tsx';
import { useData } from '../../hooks/useData.ts';
import Tooltip from '../shared/Tooltip.tsx';
import SkeletonLoader from '../shared/SkeletonLoader.tsx';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { printElementById, createWhatsAppLink } from '../../utils/print.ts';
import ConfirmModal from '../modals/ConfirmModal.tsx';

type SortableKey = 'name' | 'reputationScore' | 'createdAt';
type SortDirection = 'ascending' | 'descending';

const Dealers: React.FC<{
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    setActivePage: (page: Page, state?: any) => void;
    initialState?: any;
    onInitialStateConsumed: () => void;
}> = ({ showToast, setActivePage, initialState, onInitialStateConsumed }) => {
    const { dealers, addDealer, updateDealer, approveDealer, revokeDealer, updateDealerStatusBulk, isLoading } = useData();
    const { canCreateDealer, canUpdateDealer, canApproveDealer } = usePermissions();

    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
    const [selectedDealers, setSelectedDealers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: SortDirection } | null>({ key: 'name', direction: 'ascending' });
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [dealerToRevoke, setDealerToRevoke] = useState<Dealer | null>(null);
    const [isBulkConfirmOpen, setBulkConfirmOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState<'approve' | 'revoke' | null>(null);
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
    const [reputationFilter, setReputationFilter] = useState<'all' | 'excellent' | 'good' | 'poor'>('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        if (initialState?.status) {
            setStatusFilter(initialState.status);
            onInitialStateConsumed();
        }
    }, [initialState, onInitialStateConsumed]);
    
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timerId);
    }, [searchQuery]);

    const uniqueCities = useMemo(() => [...new Set(dealers.map(d => d.city))], [dealers]);

    const filteredDealers = useMemo(() => {
        let tempDealers = [...dealers];

        if (statusFilter !== 'all') {
            const isApproved = statusFilter === 'approved';
            tempDealers = tempDealers.filter(d => d.registrationApproved === isApproved);
        }

        if (cityFilter !== 'all') {
            tempDealers = tempDealers.filter(d => d.city === cityFilter);
        }

        if (reputationFilter !== 'all') {
            tempDealers = tempDealers.filter(d => {
                if (reputationFilter === 'excellent') return d.reputationScore >= 8;
                if (reputationFilter === 'good') return d.reputationScore >= 5 && d.reputationScore < 8;
                if (reputationFilter === 'poor') return d.reputationScore < 5;
                return true;
            });
        }
        
        if (debouncedSearchQuery) {
            const lowercasedQuery = debouncedSearchQuery.toLowerCase();
            tempDealers = tempDealers.filter(dealer =>
                dealer.name.toLowerCase().includes(lowercasedQuery) ||
                dealer.ownerName.toLowerCase().includes(lowercasedQuery) ||
                dealer.city.toLowerCase().includes(lowercasedQuery)
            );
        }
        return tempDealers;
    }, [dealers, debouncedSearchQuery, cityFilter, statusFilter, reputationFilter]);

    const sortedDealers = useMemo(() => {
        let sortableItems = [...filteredDealers];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredDealers, sortConfig]);

    const { paginatedData, currentPage, totalPages, nextPage, prevPage, setCurrentPage } = usePagination(sortedDealers, itemsPerPage);

    useEffect(() => {
        setSelectedDealers([]);
    }, [currentPage, searchQuery, sortConfig, cityFilter, statusFilter, reputationFilter, itemsPerPage]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const isIndeterminate = selectedDealers.length > 0 && selectedDealers.length < paginatedData.length;
            selectAllCheckboxRef.current.indeterminate = isIndeterminate;
        }
    }, [selectedDealers, paginatedData]);
    
    const handleEdit = (dealer: Dealer) => {
        setSelectedDealer(dealer);
        setModalOpen(true);
    };

    const handleAddNew = () => {
        setSelectedDealer(null);
        setModalOpen(true);
    };
    
    const handleSave = async (dealerData: Omit<Dealer, '_id' | 'createdAt' | 'registrationApproved'>, isEditing: boolean) => {
        setIsSaving(true);
        try {
            if (isEditing && selectedDealer) {
                await updateDealer({ ...selectedDealer, ...dealerData });
                showToast('Dealer updated successfully!', 'success');
            } else {
                await addDealer(dealerData);
                showToast('New dealer created!', 'success');
            }
        } catch (error) {
            showToast('Failed to save dealer.', 'error');
        } finally {
            setModalOpen(false);
            setIsSaving(false);
        }
    };

    const handleApprove = async (dealerId: string) => {
        try {
            await approveDealer(dealerId);
            showToast('Dealer registration approved!', 'success');
        } catch (error) {
            showToast('Failed to approve dealer.', 'error');
        }
    };

    const handleRevokeClick = (dealer: Dealer) => {
        setDealerToRevoke(dealer);
        setConfirmOpen(true);
    };

    const handleRevokeConfirm = async () => {
        if (!dealerToRevoke) return;
        try {
            await revokeDealer(dealerToRevoke._id); 
            showToast('Dealer approval revoked!', 'info');
        } catch (error) {
            showToast('Failed to revoke dealer approval.', 'error');
        }
        setDealerToRevoke(null);
        setConfirmOpen(false);
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedDealers(paginatedData.map(d => d._id));
        } else {
            setSelectedDealers([]);
        }
    };

    const handleSelectDealer = (dealerId: string, isSelected: boolean) => {
        if (isSelected) {
            setSelectedDealers(prev => [...prev, dealerId]);
        } else {
            setSelectedDealers(prev => prev.filter(id => id !== dealerId));
        }
    };

    const handleBulkActionTrigger = (action: 'approve' | 'revoke') => {
        if (!canApproveDealer || selectedDealers.length === 0) return;
        setBulkAction(action);
        setBulkConfirmOpen(true);
    };

    const handleBulkActionConfirm = async () => {
        if (!bulkAction) return;

        const isApproving = bulkAction === 'approve';
        try {
            await updateDealerStatusBulk(selectedDealers, isApproving);
            showToast(
                `${selectedDealers.length} dealer(s) ${isApproving ? 'approved' : 'approval revoked'}.`,
                isApproving ? 'success' : 'info'
            );
        } catch (error) {
            showToast('Failed to perform bulk action.', 'error');
        }
        
        setSelectedDealers([]);
        setBulkConfirmOpen(false);
        setBulkAction(null);
    };
    
    const SortIndicator = ({ columnKey }: { columnKey: SortableKey }) => {
        if (!sortConfig || sortConfig.key !== columnKey) {
            return <ChevronsUpDownIcon className="w-4 h-4 text-slate-400" />;
        }
        if (sortConfig.direction === 'ascending') {
            return <ChevronUpIcon className="w-4 h-4" />;
        }
        return <ChevronDownIcon className="w-4 h-4" />;
    };
    
    const requestSort = (key: SortableKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const viewDealerDetails = (dealerId: string) => {
        setActivePage('DealerDetail', { dealerId });
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setCityFilter('all');
        setStatusFilter('all');
        setReputationFilter('all');
        setItemsPerPage(10);
        setCurrentPage(1);
    };

    if (isLoading) {
        return <SkeletonLoader type="table" rows={6} />;
    }
    
    const showActionsColumn = canUpdateDealer || canApproveDealer;

    return (
        <div id="dealers-page-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Manage Dealers</h2>
                <div className="flex items-center space-x-2">
                     <div className="relative hidden md:block">
                        <input 
                            type="text" 
                            placeholder="Search dealer, owner..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary bg-white dark:bg-slate-800"
                        />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                     <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('dealers-page-content')} className="flex items-center justify-center space-x-2 py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <PrintIcon />
                            <span>Print</span>
                        </button>
                    </Tooltip>
                    {canCreateDealer && (
                        <button onClick={handleAddNew} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                            <PlusIcon />
                            <span className="hidden sm:inline">Add New Dealer</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col xl:flex-row justify-between items-stretch gap-4 no-print">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-wrap w-full xl:w-auto">
                    {/* Mobile Search */}
                    <div className="relative md:hidden w-full">
                        <input 
                            type="text" 
                            placeholder="Search dealer, owner..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary bg-white dark:bg-slate-800"
                        />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>

                    <div className="flex items-center w-full md:w-auto">
                        <label htmlFor="city-filter" className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2 shrink-0">City:</label>
                        <select
                            id="city-filter"
                            value={cityFilter}
                            onChange={(e) => { setCityFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full md:w-40 p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-800"
                        >
                            <option value="all">All Cities</option>
                            {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center w-full md:w-auto">
                        <label htmlFor="status-filter" className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2 shrink-0">Status:</label>
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'approved' | 'pending'); setCurrentPage(1); }}
                            className="w-full md:w-32 p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-800"
                        >
                            <option value="all">All Statuses</option>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                     <div className="flex items-center w-full md:w-auto">
                        <label htmlFor="reputation-filter" className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2 shrink-0">Reputation:</label>
                        <select
                            id="reputation-filter"
                            value={reputationFilter}
                            onChange={(e) => { setReputationFilter(e.target.value as any); setCurrentPage(1); }}
                            className="w-full md:w-40 p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-800"
                        >
                            <option value="all">All Scores</option>
                            <option value="excellent">Excellent (8+)</option>
                            <option value="good">Good (5-8)</option>
                            <option value="poor">Poor (&lt;5)</option>
                        </select>
                    </div>
                    <div className="flex items-center w-full md:w-auto">
                        <label htmlFor="rows-filter" className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2 shrink-0">Rows:</label>
                        <select
                            id="rows-filter"
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="w-full md:w-20 p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-800"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
                <button 
                    onClick={handleClearFilters}
                    className="w-full xl:w-auto py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                >
                    Clear Filters
                </button>
            </div>

            {selectedDealers.length > 0 && canApproveDealer && (
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg shadow-sm flex items-center justify-between animate-fade-in no-print">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedDealers.length} dealer(s) selected</span>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => handleBulkActionTrigger('approve')} className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Approve</button>
                        <button onClick={() => handleBulkActionTrigger('revoke')} className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700">Revoke</button>
                    </div>
                </div>
            )}
            
            <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Dealers List</h1>
                <p className="text-sm text-slate-600 mb-4">Generated on: {new Date().toLocaleDateString()}</p>
            </div>


            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 w-12 no-print">
                                    <input
                                        ref={selectAllCheckboxRef}
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary bg-transparent"
                                        onChange={handleSelectAll}
                                        checked={paginatedData.length > 0 && selectedDealers.length === paginatedData.length}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                     <button onClick={() => requestSort('name')} className="flex items-center space-x-1 group">
                                        <span>Dealer</span> <SortIndicator columnKey="name" />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                     <button onClick={() => requestSort('reputationScore')} className="flex items-center space-x-1 group">
                                        <span>Reputation</span> <SortIndicator columnKey="reputationScore" />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <button onClick={() => requestSort('createdAt')} className="flex items-center space-x-1 group">
                                        <span>Joined</span> <SortIndicator columnKey="createdAt" />
                                    </button>
                                </th>
                                {showActionsColumn && <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider no-print">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                           {paginatedData.length > 0 ? paginatedData.map(dealer => (
                               <tr
                                   key={dealer._id}
                                   onClick={() => viewDealerDetails(dealer._id)}
                                   className={`cursor-pointer transition-colors odd:bg-slate-50 dark:odd:bg-slate-800/50 ${selectedDealers.includes(dealer._id) ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                >
                                    <td className="px-4 py-4 whitespace-nowrap no-print" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary bg-transparent"
                                            checked={selectedDealers.includes(dealer._id)}
                                            onChange={(e) => handleSelectDealer(dealer._id, e.target.checked)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{dealer.name}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">{dealer.city}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{dealer.ownerName}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <span>{dealer.phone}</span>
                                            <a
                                                href={createWhatsAppLink(dealer.phone)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                                                aria-label="Chat on WhatsApp"
                                            >
                                                <Tooltip content="Chat on WhatsApp">
                                                    <WhatsAppIcon className="w-5 h-5" />
                                                </Tooltip>
                                            </a>
                                        </div>
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                                        {dealer.registrationApproved
                                            ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Approved</span>
                                            : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Pending</span>
                                        }
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap font-semibold text-sm">
                                        <span className={dealer.reputationScore > 8 ? 'text-green-600 dark:text-green-400' : dealer.reputationScore < 5 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}>
                                            {dealer.reputationScore.toFixed(1)}
                                        </span>
                                    </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(dealer.createdAt).toLocaleDateString()}</td>
                                    {showActionsColumn && (
                                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 no-print" onClick={(e) => e.stopPropagation()}>
                                            {!dealer.registrationApproved && canApproveDealer && (
                                                <Tooltip content="Approve Registration">
                                                    <button onClick={(e) => { e.stopPropagation(); handleApprove(dealer._id); }} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"><CheckCircleIcon /></button>
                                                </Tooltip>
                                            )}
                                            {dealer.registrationApproved && canApproveDealer && (
                                                <Tooltip content="Revoke Approval">
                                                    <button onClick={(e) => { e.stopPropagation(); handleRevokeClick(dealer); }} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><XCircleIcon /></button>
                                                </Tooltip>
                                            )}
                                            {canUpdateDealer && (
                                                <Tooltip content="Edit Dealer Details">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(dealer); }} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50"><EditIcon /></button>
                                                </Tooltip>
                                            )}
                                        </td>
                                    )}
                               </tr>
                           )) : (
                               <tr>
                                   <td colSpan={showActionsColumn ? 8 : 7}>
                                       <EmptyState
                                            icon={<UsersIcon className="w-10 h-10" />}
                                            title="No Dealers Found"
                                            message={searchQuery || cityFilter !== 'all' || statusFilter !== 'all' || reputationFilter !== 'all' ? "Your filters didn't match any dealers." : "Get started by adding your first dealer to the system."}
                                            action={canCreateDealer && !searchQuery ? (
                                                 <button onClick={handleAddNew} className="flex items-center space-x-2 mx-auto py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary no-print">
                                                    <PlusIcon />
                                                    <span>Create First Dealer</span>
                                                </button>
                                            ) : undefined}
                                        />
                                   </td>
                               </tr>
                           )}
                        </tbody>
                    </table>
                </div>
                 <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
            </div>

            <DealerModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} dealer={selectedDealer} isSaving={isSaving} />
            
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleRevokeConfirm}
                title="Revoke Dealer Approval"
                message={`Are you sure you want to revoke approval for "${dealerToRevoke?.name}"? They will lose access to the dealer portal.`}
            />

            <ConfirmModal
                isOpen={isBulkConfirmOpen}
                onClose={() => setBulkConfirmOpen(false)}
                onConfirm={handleBulkActionConfirm}
                title={`Confirm Bulk ${bulkAction === 'approve' ? 'Approval' : 'Revocation'}`}
                message={`Are you sure you want to ${bulkAction} the ${selectedDealers.length} selected dealers?`}
            />
        </div>
    );
};

export default Dealers;