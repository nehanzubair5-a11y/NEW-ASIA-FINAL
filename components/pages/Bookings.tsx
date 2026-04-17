import React, { useState, useMemo, useEffect } from 'react';
import type { Booking } from '../../types.ts';
import { BookingStatus } from '../../types.ts';
import { PlusIcon, DollarSignIcon, FileTextIcon, EditIcon, CalendarIcon, PrintIcon, ArchiveIcon, WhatsAppIcon, ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon, XCircleIcon } from '../icons/Icons.tsx';
import InvoiceModal from '../modals/InvoiceModal.tsx';
import PaymentsModal from '../modals/PaymentsModal.tsx';
import BookingModal from '../modals/BookingModal.tsx';
import AllocateStockModal from '../modals/AllocateStockModal.tsx';
import { useAuth } from '../../hooks/useAuth.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useData } from '../../hooks/useData.ts';
import Tooltip from '../shared/Tooltip.tsx';
import SkeletonLoader from '../shared/SkeletonLoader.tsx';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { printElementById, createWhatsAppLink } from '../../utils/print.ts';
import ConfirmModal from '../modals/ConfirmModal.tsx';

type SortableKey = 'customerName' | 'productName' | 'dealerName' | 'bookingTimestamp';
type SortDirection = 'ascending' | 'descending';

const Bookings: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { bookings, products, dealers, addBooking, updateBooking, cancelBooking, isLoading } = useData();
    const { addToQueue, isOnline } = useAppContext();
    const { canCreateBooking, canUpdateBooking, canViewBookingActions, canViewInvoice } = usePermissions();

    const [isInvoiceOpen, setInvoiceOpen] = useState(false);
    const [isPaymentsOpen, setPaymentsOpen] = useState(false);
    const [isBookingModalOpen, setBookingModalOpen] = useState(false);
    const [isAllocateModalOpen, setAllocateModalOpen] = useState(false);
    const [isConfirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<BookingStatus | 'all'>('all');
    const [dealerFilter, setDealerFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: SortDirection } | null>({ key: 'bookingTimestamp', direction: 'descending' });

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timerId);
    }, [searchQuery]);

    const findProductInfo = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) {
                return { product, variant };
            }
        }
        return { product: null, variant: null };
    };

    const enrichedBookings = useMemo(() => {
        return bookings.map(b => {
            const { product, variant } = findProductInfo(b.variantId);
            const dealer = dealers.find(d => d._id === b.dealerId);
            return {
                ...b,
                productName: `${product?.brand} ${product?.modelName} ${variant?.name}`,
                dealerName: dealer?.name || 'N/A',
            };
        });
    }, [bookings, products, dealers]);


    const filteredBookings = useMemo(() => {
        const lowercasedQuery = debouncedSearchQuery.toLowerCase();

        return enrichedBookings.filter(b => {
            if (filterStatus !== 'all' && b.status !== filterStatus) return false;
            if (dealerFilter !== 'all' && b.dealerId !== dealerFilter) return false;

            const bookingDate = new Date(b.bookingTimestamp);
            if (startDate && bookingDate < new Date(startDate)) return false;
            if (endDate && bookingDate > new Date(endDate)) return false;

            if (debouncedSearchQuery) {
                return b.customerName.toLowerCase().includes(lowercasedQuery) || 
                       b.customerPhone.includes(lowercasedQuery) ||
                       b.productName.toLowerCase().includes(lowercasedQuery);
            }
            
            return true;
        });
    }, [enrichedBookings, filterStatus, dealerFilter, startDate, endDate, debouncedSearchQuery]);

    const sortedBookings = useMemo(() => {
        let sortableItems = [...filteredBookings];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredBookings, sortConfig]);

    const { paginatedData, currentPage, totalPages, nextPage, prevPage, setCurrentPage } = usePagination(sortedBookings, 10);
    
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

    const openModal = (booking: Booking, modal: 'invoice' | 'payments' | 'edit') => {
        setSelectedBooking(booking);
        if (modal === 'invoice') setInvoiceOpen(true);
        if (modal === 'payments') setPaymentsOpen(true);
        if (modal === 'edit') setBookingModalOpen(true);
    };

    const openAllocateModal = (booking: Booking) => {
        setSelectedBooking(booking);
        setAllocateModalOpen(true);
    };

    const handleCancelClick = (booking: Booking) => {
        setBookingToCancel(booking);
        setConfirmCancelOpen(true);
    };

    const handleCancelConfirm = async () => {
        if (!bookingToCancel) return;
        try {
            await cancelBooking(bookingToCancel._id);
            showToast('Booking has been cancelled.', 'success');
        } catch (error) {
            showToast('Failed to cancel booking.', 'error');
        }
        setConfirmCancelOpen(false);
        setBookingToCancel(null);
    };
    
    const handleAddNew = () => {
        setSelectedBooking(null);
        setBookingModalOpen(true);
    };

    const getStatusColor = (status: BookingStatus) => {
        switch (status) {
            case BookingStatus.Pending: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case BookingStatus.Allocated: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case BookingStatus.Delivered: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case BookingStatus.Cancelled: return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };
    
    const getStatusTooltip = (status: BookingStatus) => {
        switch (status) {
            case BookingStatus.Pending: return 'Awaiting vehicle allocation from stock.';
            case BookingStatus.Allocated: return 'Vehicle allocated, pending delivery.';
            case BookingStatus.Delivered: return 'Vehicle has been delivered to the customer.';
            case BookingStatus.Cancelled: return 'This booking has been cancelled.';
            default: return '';
        }
    };

    const getPaymentStatusInfo = (booking: Booking): { text: string; color: string; } => {
        const { variant } = findProductInfo(booking.variantId);
        const variantPrice = variant?.price ?? 0;
        const totalPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid <= 0) {
            return { text: 'Unpaid', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
        } else if (totalPaid >= variantPrice) {
            return { text: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
        } else {
            return { text: 'Partial', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
        }
    };

    const handleSaveBooking = async (bookingData: Omit<Booking, '_id' | 'bookingTimestamp' | 'payments' | 'stockItemId'>, isEditing: boolean) => {
        if (isEditing && selectedBooking) {
            const updatedBookingData = { ...selectedBooking, ...bookingData };
            if (isOnline) {
                await updateBooking(updatedBookingData);
            } else {
                 addToQueue({ type: 'UPDATE_BOOKING', payload: updatedBookingData, timestamp: Date.now() });
            }
            showToast('Booking updated successfully!', 'success');
        } else {
             if (isOnline) {
                await addBooking(bookingData);
                showToast('New booking created!', 'success');
             } else {
                addToQueue({ type: 'ADD_BOOKING', payload: bookingData, timestamp: Date.now() });
                showToast('You are offline. Booking added to sync queue.', 'info');
             }
        }
        setBookingModalOpen(false);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setFilterStatus('all');
        setDealerFilter('all');
        setStartDate('');
        setEndDate('');
    };

    if (isLoading) {
        return <SkeletonLoader type="table" rows={6} />;
    }

    return (
        <div id="bookings-page-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Manage Bookings</h2>
                <div className="flex items-center space-x-2">
                    <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('bookings-page-content')} className="flex items-center justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <PrintIcon />
                        </button>
                    </Tooltip>
                    {canCreateBooking && (
                        <button onClick={handleAddNew} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                            <PlusIcon />
                            <span>New Booking</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-wrap w-full xl:w-auto">
                    <div className="relative w-full md:w-64">
                        <input type="text" placeholder="Search customer, phone, product..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="p-2 pl-10 border border-slate-300 rounded-md shadow-sm w-full" />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-4 w-full md:w-auto">
                         <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                            <label className="text-sm font-medium text-slate-600 shrink-0">Status:</label>
                            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as BookingStatus | 'all'); setCurrentPage(1); }} className="p-2 border border-slate-300 rounded-md shadow-sm text-sm w-full md:w-32">
                                <option value="all">All</option>
                                {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                         <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                            <label className="text-sm font-medium text-slate-600 shrink-0">Dealer:</label>
                            <select value={dealerFilter} onChange={(e) => { setDealerFilter(e.target.value); setCurrentPage(1); }} className="p-2 border border-slate-300 rounded-md shadow-sm text-sm w-full md:w-40">
                                <option value="all">All</option>
                                {dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-4 w-full md:w-auto">
                         <div className="flex items-center">
                            <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">From:</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-slate-300 rounded-md shadow-sm text-sm w-full" />
                        </div>
                         <div className="flex items-center">
                            <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">To:</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-slate-300 rounded-md shadow-sm text-sm w-full" />
                        </div>
                    </div>
                </div>
                 <button onClick={handleClearFilters} className="w-full xl:w-auto py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors shrink-0">
                    Clear Filters
                </button>
            </div>


            <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Bookings Report</h1>
                <p className="text-sm text-slate-600 mb-4">
                    Filter: Status ({filterStatus}) | Generated on: {new Date().toLocaleDateString()}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-100/80 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><button onClick={() => requestSort('customerName')} className="flex items-center space-x-1"><span>Customer</span><SortIndicator columnKey="customerName"/></button></th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><button onClick={() => requestSort('productName')} className="flex items-center space-x-1"><span>Product</span><SortIndicator columnKey="productName"/></button></th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><button onClick={() => requestSort('dealerName')} className="flex items-center space-x-1"><span>Dealer</span><SortIndicator columnKey="dealerName"/></button></th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"><button onClick={() => requestSort('bookingTimestamp')} className="flex items-center space-x-1"><span>Date</span><SortIndicator columnKey="bookingTimestamp"/></button></th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Booking Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Status</th>
                                {canViewBookingActions && <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider no-print">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {paginatedData.length > 0 ? paginatedData.map(booking => {
                                const { product, variant } = findProductInfo(booking.variantId);
                                const dealer = dealers.find(d => d._id === booking.dealerId);
                                const paymentStatus = getPaymentStatusInfo(booking);
                                const prefilledMessage = `Hi ${dealer?.name}, regarding Booking ID: #${booking._id.slice(-6)} for customer ${booking.customerName}.`;
                                return (
                                    <tr key={booking._id} className="odd:bg-slate-50 dark:odd:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{booking.customerName}</div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400">{booking.customerPhone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{product?.brand} {product?.modelName}</div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400">{variant?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{dealer?.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(booking.bookingTimestamp).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Tooltip content={getStatusTooltip(booking.status)}>
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusColor(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${paymentStatus.color}`}>
                                                {paymentStatus.text}
                                            </span>
                                        </td>
                                        {canViewBookingActions && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 no-print">
                                                {booking.status === BookingStatus.Pending && canUpdateBooking && (
                                                    <Tooltip content="Allocate Stock">
                                                        <button onClick={() => openAllocateModal(booking)} className="text-cyan-600 hover:text-cyan-900 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1 rounded-full hover:bg-cyan-100 dark:hover:bg-cyan-900/50"><ArchiveIcon /></button>
                                                    </Tooltip>
                                                )}
                                                {canUpdateBooking && (
                                                    <>
                                                        <Tooltip content="Edit Booking">
                                                            <button onClick={() => openModal(booking, 'edit')} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50"><EditIcon /></button>
                                                        </Tooltip>
                                                        <Tooltip content="Manage Payments">
                                                            <button onClick={() => openModal(booking, 'payments')} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"><DollarSignIcon /></button>
                                                        </Tooltip>
                                                    </>
                                                )}
                                                {booking.status !== BookingStatus.Cancelled && booking.status !== BookingStatus.Delivered && canUpdateBooking && (
                                                    <Tooltip content="Cancel Booking">
                                                        <button onClick={() => handleCancelClick(booking)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><XCircleIcon /></button>
                                                    </Tooltip>
                                                )}
                                                {canViewInvoice && (
                                                    <Tooltip content="View Invoice">
                                                        <button onClick={() => openModal(booking, 'invoice')} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"><FileTextIcon /></button>
                                                    </Tooltip>
                                                )}
                                                <Tooltip content="Contact Dealer on WhatsApp">
                                                    <a 
                                                        href={createWhatsAppLink(dealer?.phone || '', prefilledMessage)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 inline-block"
                                                    >
                                                        <WhatsAppIcon />
                                                    </a>
                                                </Tooltip>
                                            </td>
                                        )}
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={canViewBookingActions ? 7 : 6}>
                                        <EmptyState
                                            icon={<CalendarIcon className="w-10 h-10" />}
                                            title="No Bookings Found"
                                            message={filterStatus !== 'all' || dealerFilter !== 'all' || searchQuery ? "Your filters didn't match any bookings." : "There are no customer bookings in the system yet."}
                                            action={canCreateBooking && filterStatus === 'all' && !searchQuery ? (
                                                 <button onClick={handleAddNew} className="flex items-center space-x-2 mx-auto py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary no-print">
                                                    <PlusIcon />
                                                    <span>Create First Booking</span>
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

            <InvoiceModal isOpen={isInvoiceOpen} onClose={() => setInvoiceOpen(false)} booking={selectedBooking} />
            <PaymentsModal isOpen={isPaymentsOpen} onClose={() => setPaymentsOpen(false)} booking={selectedBooking} showToast={showToast} />
            <BookingModal isOpen={isBookingModalOpen} onClose={() => setBookingModalOpen(false)} onSave={handleSaveBooking} booking={selectedBooking} />
            <AllocateStockModal isOpen={isAllocateModalOpen} onClose={() => setAllocateModalOpen(false)} booking={selectedBooking} showToast={showToast} />
            <ConfirmModal
                isOpen={isConfirmCancelOpen}
                onClose={() => setConfirmCancelOpen(false)}
                onConfirm={handleCancelConfirm}
                title="Cancel Booking"
                message={`Are you sure you want to cancel the booking for "${bookingToCancel?.customerName}"? Any reserved stock will be made available again.`}
            />
        </div>
    );
};

export default Bookings;