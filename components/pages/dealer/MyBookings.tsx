import React, { useState, useMemo } from 'react';
import type { Booking } from '../../../types.ts';
import { BookingStatus } from '../../../types.ts';
import { PlusIcon, DollarSignIcon, FileTextIcon, EditIcon, CalendarIcon, PrintIcon, XCircleIcon } from '../../icons/Icons.tsx';
import InvoiceModal from '../../modals/InvoiceModal.tsx';
import PaymentsModal from '../../modals/PaymentsModal.tsx';
import BookingModal from '../../modals/BookingModal.tsx';
import { useAuth } from '../../../hooks/useAuth.ts';
import { useAppContext } from '../../../hooks/useAppContext.ts';
import Tooltip from '../../shared/Tooltip.tsx';
import EmptyState from '../../shared/EmptyState.tsx';
import { useData } from '../../../hooks/useData.ts';
import { usePermissions } from '../../../hooks/usePermissions.ts';
import { printElementById } from '../../../utils/print.ts';
import usePagination from '../../../hooks/usePagination.ts';
import Pagination from '../../shared/Pagination.tsx';
import ConfirmModal from '../../modals/ConfirmModal.tsx';

const MyBookings: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { user } = useAuth();
    const { bookings, products, addBooking, updateBooking, cancelBooking } = useData();
    const { addToQueue, isOnline } = useAppContext();
    const { canManageOwnBookings } = usePermissions();
    
    const [isInvoiceOpen, setInvoiceOpen] = useState(false);
    const [isPaymentsOpen, setPaymentsOpen] = useState(false);
    const [isBookingModalOpen, setBookingModalOpen] = useState(false);
    const [isConfirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredBookings = useMemo(() => {
        let dealerBookings = bookings.filter(b => b.dealerId === user?.dealerId);

        if (statusFilter !== 'all') {
            dealerBookings = dealerBookings.filter(b => b.status === statusFilter);
        }

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            dealerBookings = dealerBookings.filter(b => 
                b.customerName.toLowerCase().includes(lowercasedQuery) ||
                b.customerPhone.includes(lowercasedQuery)
            );
        }

        return dealerBookings;
    }, [user, bookings, statusFilter, searchQuery]);
    
    const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(filteredBookings, 10);

    const openModal = (booking: Booking, modal: 'invoice' | 'payments' | 'edit') => {
        setSelectedBooking(booking);
        if (modal === 'invoice') setInvoiceOpen(true);
        if (modal === 'payments') setPaymentsOpen(true);
        if (modal === 'edit') setBookingModalOpen(true);
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

    const handleSaveBooking = (bookingData: Omit<Booking, '_id' | 'bookingTimestamp' | 'payments'>, isEditing: boolean) => {
        if (isEditing && selectedBooking) {
            updateBooking({ ...selectedBooking, ...bookingData });
            showToast('Booking updated successfully!', 'success');
        } else {
             if (isOnline) {
                addBooking(bookingData);
                showToast('New booking created!', 'success');
             } else {
                addToQueue({ type: 'ADD_BOOKING', payload: bookingData, timestamp: Date.now() });
                showToast('You are offline. Booking added to sync queue.', 'info');
             }
        }
        setBookingModalOpen(false);
    };

    const getStatusColor = (status: BookingStatus) => {
        switch (status) {
            case BookingStatus.Pending: return 'bg-yellow-100 text-yellow-800';
            case BookingStatus.Allocated: return 'bg-blue-100 text-blue-800';
            case BookingStatus.Delivered: return 'bg-green-100 text-green-800';
            case BookingStatus.Cancelled: return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
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
    
    const findProductInfo = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) {
                return { product, variant };
            }
        }
        return { product: null, variant: null };
    };

    return (
        <div id="my-bookings-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-gray-800">My Bookings</h2>
                <div className="flex items-center space-x-2">
                    <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('my-bookings-content')} className="flex items-center justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            <PrintIcon />
                        </button>
                    </Tooltip>
                    {canManageOwnBookings && (
                        <button onClick={handleAddNew} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                            <PlusIcon />
                            <span>New Booking</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full">
                     <div className="relative w-full md:w-64">
                        <input type="text" placeholder="Search customer..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 pr-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm w-full" />
                         <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none"><svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg></div>
                    </div>
                    <div className="flex flex-col items-start md:flex-row md:items-center w-full md:w-auto gap-1 md:gap-2">
                        <label className="text-sm font-medium text-slate-600 shrink-0">Status:</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="p-2 border border-slate-300 rounded-md shadow-sm text-sm w-full md:w-auto">
                            <option value="all">All Statuses</option>
                            {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedData.length > 0 ? paginatedData.map(booking => {
                                const { product, variant } = findProductInfo(booking.variantId);
                                return (
                                    <tr key={booking._id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                                            <div className="text-sm text-gray-500">{booking.customerPhone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{product?.brand} {product?.modelName}</div>
                                            <div className="text-sm text-gray-500">{variant?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(booking.bookingTimestamp).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Tooltip content={getStatusTooltip(booking.status)}>
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusColor(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            {canManageOwnBookings && (
                                                <>
                                                    <Tooltip content="Edit Booking">
                                                        <button onClick={() => openModal(booking, 'edit')} className="text-indigo-600 hover:text-indigo-900 transition-colors p-1 rounded-full hover:bg-indigo-100"><EditIcon /></button>
                                                    </Tooltip>
                                                    <Tooltip content="Manage Payments">
                                                        <button onClick={() => openModal(booking, 'payments')} className="text-green-600 hover:text-green-900 transition-colors p-1 rounded-full hover:bg-green-100"><DollarSignIcon /></button>
                                                    </Tooltip>
                                                     {booking.status !== BookingStatus.Cancelled && booking.status !== BookingStatus.Delivered && (
                                                        <Tooltip content="Cancel Booking">
                                                            <button onClick={() => handleCancelClick(booking)} className="text-red-600 hover:text-red-900 transition-colors p-1 rounded-full hover:bg-red-100"><XCircleIcon /></button>
                                                        </Tooltip>
                                                     )}
                                                </>
                                            )}
                                            <Tooltip content="View Invoice">
                                                <button onClick={() => openModal(booking, 'invoice')} className="text-blue-600 hover:text-blue-900 transition-colors p-1 rounded-full hover:bg-blue-100"><FileTextIcon /></button>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState
                                            icon={<CalendarIcon className="w-10 h-10" />}
                                            title="No Bookings Found"
                                            message={searchQuery || statusFilter !== 'all' ? "No bookings match your filters." : "When you sell a vehicle to a customer, their booking will appear here."}
                                            action={canManageOwnBookings ? (
                                                <button onClick={handleAddNew} className="flex items-center space-x-2 mx-auto py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
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

export default MyBookings;