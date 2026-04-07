import React, { useState, useEffect } from 'react';
import type { Booking } from '../../types.ts';
import { BookingStatus } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (bookingData: Omit<Booking, '_id' | 'bookingTimestamp' | 'payments'>, isEditing: boolean) => void;
    booking: Booking | null;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, onSave, booking }) => {
    const { user } = useAuth();
    const { dealers, products } = useData();
    const isDealer = user?.role === 'Dealer';
    
    const [formData, setFormData] = useState<Omit<Booking, '_id' | 'bookingTimestamp' | 'payments'>>({
        customerName: '',
        customerPhone: '',
        dealerId: '',
        variantId: '',
        status: BookingStatus.Pending,
    });

    useEffect(() => {
        if (booking) { // Editing
            setFormData({
                customerName: booking.customerName,
                customerPhone: booking.customerPhone,
                dealerId: booking.dealerId,
                variantId: booking.variantId,
                status: booking.status,
            });
        } else { // Creating
            setFormData({ 
                customerName: '', 
                customerPhone: '', 
                dealerId: isDealer ? user.dealerId! : (dealers[0]?._id || ''), 
                variantId: products[0]?.variants[0]?._id || '', 
                status: BookingStatus.Pending 
            });
        }
    }, [booking, isOpen, isDealer, user, dealers, products]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as BookingStatus }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData, !!booking);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start sm:items-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b flex-shrink-0">
                        <h3 className="text-xl font-semibold text-gray-800">{booking ? 'Edit Booking' : 'Create New Booking'}</h3>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                        <div>
                            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Customer Name</label>
                            <input type="text" name="customerName" id="customerName" value={formData.customerName} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                            <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">Customer Phone</label>
                            <input type="tel" name="customerPhone" id="customerPhone" value={formData.customerPhone} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                            <label htmlFor="variantId" className="block text-sm font-medium text-gray-700">Product</label>
                            <select name="variantId" id="variantId" value={formData.variantId} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary">
                                {products.map(p => (
                                    <optgroup label={`${p.brand} ${p.modelName}`} key={p._id}>
                                        {p.variants.map(v => (
                                            <option key={v._id} value={v._id}>{v.name} - Rs. {v.price.toLocaleString()}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dealerId" className="block text-sm font-medium text-gray-700">Dealer</label>
                            <select name="dealerId" id="dealerId" value={formData.dealerId} onChange={handleChange} required disabled={isDealer} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary disabled:bg-gray-100">
                                {dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Booking Status</label>
                            <select name="status" id="status" value={formData.status} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary">
                                {Object.values(BookingStatus).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 text-right space-x-2 rounded-b-lg flex-shrink-0">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">Save Booking</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookingModal;