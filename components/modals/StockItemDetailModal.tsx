import React, { useMemo, useState, useEffect } from 'react';
import { StockItem, StockStatus, BookingStatus } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import { ClockIcon, MotorcycleIcon, ArchiveIcon, UsersIcon, CalendarIcon, CheckCircleIcon, DollarSignIcon, EditIcon, SaveIcon, XIcon } from '../icons/Icons.tsx';

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
    const { products, bookings, dealers, updateStockItem } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [editStatus, setEditStatus] = useState<StockStatus>(StockStatus.Available);
    const [editAssignedAt, setEditAssignedAt] = useState('');
    const [editDealerId, setEditDealerId] = useState<string>('');

    useEffect(() => {
        if (item) {
            setEditStatus(item.status);
            setEditAssignedAt(item.assignedAt.split('T')[0]);
            setEditDealerId(item.dealerId || '');
        }
    }, [item]);

    const handleSave = async () => {
        if (!item) return;
        await updateStockItem(item._id, {
            status: editStatus,
            assignedAt: new Date(editAssignedAt).toISOString(),
            dealerId: editDealerId === '' ? null : editDealerId
        });
        setIsEditing(false);
        onClose();
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
                <div className="p-6 border-b flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary">
                            <MotorcycleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800">{product?.brand} {product?.modelName}</h3>
                            <p className="text-sm text-gray-500">{variant?.name}</p>
                            <p className="text-xs font-mono text-gray-400 mt-1">VIN: {item.vin}</p>
                        </div>
                    </div>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="text-gray-500 hover:text-primary transition-colors">
                            <EditIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <div className="p-6 space-y-6 bg-slate-50/50">
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Current Status</h4>
                        {isEditing ? (
                            <div className="bg-white p-4 rounded-lg border space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value as StockStatus)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                                    >
                                        {Object.values(StockStatus).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Date</label>
                                    <input
                                        type="date"
                                        value={editAssignedAt}
                                        onChange={(e) => setEditAssignedAt(e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                                    <select
                                        value={editDealerId}
                                        onChange={(e) => setEditDealerId(e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                                    >
                                        <option value="">Central Stock</option>
                                        {dealers.map(dealer => (
                                            <option key={dealer._id} value={dealer._id}>{dealer.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end space-x-2 mt-4">
                                    <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleSave} className="px-3 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-secondary">Save Changes</button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-lg border">
                                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full ${statusInfo.color}`}>
                                    {item.status}
                                </span>
                                <p className="text-sm text-gray-600 mt-2">{statusInfo.text}</p>
                            </div>
                        )}
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
