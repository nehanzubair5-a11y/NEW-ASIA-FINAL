import React, { useMemo } from 'react';
import { StockItem, StockStatus, BookingStatus } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import { ClockIcon, MotorcycleIcon, ArchiveIcon, UsersIcon, CalendarIcon, CheckCircleIcon, DollarSignIcon } from '../icons/Icons.tsx';

interface StockItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: StockItem | null;
}

const getStatusInfo = (status: StockStatus): { color: string; text: string } => {
    switch (status) {
        case StockStatus.Available: return { color: 'bg-green-100 text-green-800', text: 'Available for Sale' };
        case StockStatus.Reserved: return { color: 'bg-yellow-100 text-yellow-800', text: 'Reserved for a Customer' };
        case StockStatus.Sold: return { color: 'bg-red-100 text-red-800', text: 'Sold and Delivered' };
        default: return { color: 'bg-slate-100 text-slate-800', text: 'Unknown' };
    }
};

const StockItemDetailModal: React.FC<StockItemDetailModalProps> = ({ isOpen, onClose, item }) => {
    const { products, bookings, dealers } = useData();

    const findProductInfo = (variantId: string) => {
        for (const product of products) {
            const variant = product.variants.find(v => v._id === variantId);
            if (variant) {
                return { product, variant };
            }
        }
        return { product: null, variant: null };
    };
    
    const itemHistory = useMemo(() => {
        if (!item) return [];

        const history = [];
        const dealer = dealers.find(d => d._id === item.dealerId);

        // 1. Assignment Event
        history.push({
            icon: dealer ? <UsersIcon className="w-5 h-5" /> : <ArchiveIcon className="w-5 h-5" />,
            bgColor: dealer ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600',
            title: `Assigned to ${dealer ? dealer.name : 'Central Stock'}`,
            timestamp: item.assignedAt,
        });

        // Find associated booking
        const booking = bookings.find(b => b.stockItemId === item._id);

        if (booking) {
            // 2. Reservation Event
            history.push({
                icon: <CalendarIcon className="w-5 h-5" />,
                bgColor: 'bg-yellow-100 text-yellow-600',
                title: `Reserved for Booking - ${booking.customerName}`,
                timestamp: booking.bookingTimestamp,
            });

            // 3. Sold/Delivered Event
            if (item.status === StockStatus.Sold && booking.status === BookingStatus.Delivered) {
                 const lastPayment = booking.payments.length > 0
                    ? booking.payments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
                    : null;
                
                history.push({
                    icon: <CheckCircleIcon className="w-5 h-5" />,
                    bgColor: 'bg-green-100 text-green-600',
                    title: `Sold & Delivered to ${booking.customerName}`,
                    // Use last payment date as delivery date, fallback to booking date
                    timestamp: lastPayment ? lastPayment.timestamp : booking.bookingTimestamp,
                });
            }
        }
        
        // Sort events chronologically
        return history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [item, bookings, dealers]);


    if (!isOpen || !item) return null;

    const { product, variant } = findProductInfo(item.variantId);
    const statusInfo = getStatusInfo(item.status);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex items-start space-x-4">
                     <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary">
                        <MotorcycleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">{product?.brand} {product?.modelName}</h3>
                        <p className="text-sm text-gray-500">{variant?.name}</p>
                        <p className="text-xs font-mono text-gray-400 mt-1">VIN: {item.vin}</p>
                    </div>
                </div>
                <div className="p-6 space-y-6 bg-slate-50/50">
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Current Status</h4>
                        <div className="bg-white p-4 rounded-lg border">
                            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full ${statusInfo.color}`}>
                                {item.status}
                            </span>
                             <p className="text-sm text-gray-600 mt-2">{statusInfo.text}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Financials</h4>
                        <div className="bg-white p-4 rounded-lg border flex items-center space-x-4">
                             <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-100 text-green-600">
                                <DollarSignIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Unit Price</p>
                                <p className="text-lg font-bold text-gray-800">
                                    {variant ? `Rs. ${variant.price.toLocaleString()}` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                     <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Item History</h4>
                        <div className="bg-white p-4 rounded-lg border">
                            {itemHistory.length > 0 ? (
                                <ul className="space-y-4">
                                    {itemHistory.map((event, index) => (
                                       <li key={index} className="flex items-start space-x-3">
                                           <div className={`flex-shrink-0 h-8 w-8 rounded-full ${event.bgColor} flex items-center justify-center`}>
                                                {event.icon}
                                           </div>
                                           <div>
                                               <p className="text-sm font-medium text-gray-800">{event.title}</p>
                                               <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                                           </div>
                                       </li>
                                    ))}
                               </ul>
                           ) : (
                                <p className="text-sm text-gray-500 text-center">No history events found.</p>
                           )}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 text-right">
                    <button onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockItemDetailModal;
