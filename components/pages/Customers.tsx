import React, { useState, useMemo } from 'react';
import { useData } from '../../hooks/useData.ts';
import { Customer } from '../../types.ts';
import Tooltip from '../shared/Tooltip.tsx';
import { PlusIcon, EditIcon, SearchIcon } from '../icons/Icons.tsx';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';

const Customers: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { customers, bookings } = useData();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCustomers = useMemo(() => {
        let filtered = customers;
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(lowercasedQuery) || 
                c.phone.includes(lowercasedQuery) ||
                (c.email && c.email.toLowerCase().includes(lowercasedQuery))
            );
        }
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [customers, searchQuery]);

    const { paginatedData, currentPage, totalPages, nextPage, prevPage, setCurrentPage } = usePagination(filteredCustomers, 10);

    const getCustomerBookingsCount = (customerId: string) => {
        return bookings.filter(b => b.customerId === customerId).length;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Customers</h2>
                {/* Add Customer button could go here, but for now they are added via bookings */}
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <input 
                        type="text" 
                        placeholder="Search by name, phone, or email..." 
                        value={searchQuery} 
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
                        className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm w-full bg-white dark:bg-slate-700 focus:ring-primary focus:border-primary" 
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-slate-400" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Bookings</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Added On</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {paginatedData.length > 0 ? paginatedData.map(customer => (
                                <tr key={customer._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{customer.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900 dark:text-slate-100">{customer.phone}</div>
                                        {customer.email && <div className="text-sm text-slate-500 dark:text-slate-400">{customer.email}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                            {getCustomerBookingsCount(customer._id)} Bookings
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(customer.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4}>
                                        <EmptyState
                                            icon={<SearchIcon className="w-10 h-10" />}
                                            title="No Customers Found"
                                            message={searchQuery ? "Try adjusting your search query." : "No customers have been added yet."}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
            </div>
        </div>
    );
};

export default Customers;
