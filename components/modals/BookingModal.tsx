import React, { useState, useEffect } from 'react';
import type { Booking, Customer } from '../../types.ts';
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
    const { dealers, products, customers, addCustomer } = useData();
    const isDealer = user?.role === 'Dealer';
    
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

    const [formData, setFormData] = useState<Omit<Booking, '_id' | 'bookingTimestamp' | 'payments'>>({
        customerId: '',
        customerName: '',
        customerPhone: '',
        dealerId: '',
        variantId: '',
        status: BookingStatus.Pending,
    });

    useEffect(() => {
        if (booking) { // Editing
            setFormData({
                customerId: booking.customerId || '',
                customerName: booking.customerName,
                customerPhone: booking.customerPhone,
                dealerId: booking.dealerId,
                variantId: booking.variantId,
                status: booking.status,
            });
            if (booking.customerId) {
                setSelectedCustomerId(booking.customerId);
                setIsCreatingCustomer(false);
            } else {
                setIsCreatingCustomer(true);
            }
        } else { // Creating
            setFormData({ 
                customerId: '',
                customerName: '', 
                customerPhone: '', 
                dealerId: isDealer ? user.dealerId! : (dealers[0]?._id || ''), 
                variantId: products[0]?.variants[0]?._id || '', 
                status: BookingStatus.Pending 
            });
            setIsCreatingCustomer(true);
            setSelectedCustomerId('');
        }
    }, [booking, isOpen, isDealer, user, dealers, products]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'new') {
            setIsCreatingCustomer(true);
            setSelectedCustomerId('');
            setFormData(prev => ({ ...prev, customerId: '', customerName: '', customerPhone: '' }));
        } else {
            setIsCreatingCustomer(false);
            setSelectedCustomerId(val);
            const customer = customers.find(c => c._id === val);
            if (customer) {
                setFormData(prev => ({ 
                    ...prev, 
                    customerId: customer._id,
                    customerName: customer.name, 
                    customerPhone: customer.phone 
                }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalFormData = { ...formData };
        
        if (isCreatingCustomer && formData.customerName && formData.customerPhone) {
            try {
                const newCustomer = await addCustomer({
                    name: formData.customerName,
                    phone: formData.customerPhone
                });
                finalFormData.customerId = newCustomer._id;
            } catch (error) {
                console.error("Failed to create customer:", error);
                // We can still proceed with the booking even if customer creation fails,
                // or we could show an error. For now, we'll just proceed.
            }
        }
        
        onSave(finalFormData, !!booking);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start sm:items-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b flex-shrink-0">
                        <h3 className="text-xl font-semibold text-gray-800">{booking ? 'Edit Booking' : 'Create New Booking'}</h3>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                        {!booking && (
                            <div>
                                <label htmlFor="customerSelect" className="block text-sm font-medium text-gray-700">Customer</label>
                                <select id="customerSelect" value={isCreatingCustomer ? 'new' : selectedCustomerId} onChange={handleCustomerSelect} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary">
                                    <option value="new">+ Create New Customer</option>
                                    <optgroup label="Existing Customers">
                                        {customers.map(c => (
                                            <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        )}
                        
                        {(isCreatingCustomer || booking) && (
                            <>
                                <div>
                                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Customer Name</label>
                                    <input type="text" name="customerName" id="customerName" value={formData.customerName} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary" disabled={!isCreatingCustomer && !booking} />
                                </div>
                                <div>
                                    <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">Customer Phone</label>
                                    <input type="tel" name="customerPhone" id="customerPhone" value={formData.customerPhone} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary" disabled={!isCreatingCustomer && !booking} />
                                </div>
                            </>
                        )}
                        
                        <div>
                            <label htmlFor="variantId" className="block text-sm font-medium text-gray-700">Product</label>
                            <select name="variantId" id="variantId" value={formData.variantId} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary">
                                {products.filter(p => p.isActive !== false).map(p => {
                                    const activeVariants = p.variants.filter(v => v.isActive !== false);
                                    if (activeVariants.length === 0) return null;
                                    return (
                                        <optgroup label={`${p.brand} ${p.modelName}`} key={p._id}>
                                            {activeVariants.map(v => (
                                                <option key={v._id} value={v._id}>{v.name} - Rs. {v.price.toLocaleString()}</option>
                                            ))}
                                        </optgroup>
                                    );
                                })}
                            </select>
                            {formData.variantId && products.find(p => p.variants.some(v => v._id === formData.variantId))?.imageUrl && (
                                <div className="mt-2">
                                    <img src={products.find(p => p.variants.some(v => v._id === formData.variantId))?.imageUrl} alt="Product Preview" className="w-24 h-24 object-cover rounded-md border border-gray-200" referrerPolicy="no-referrer" />
                                </div>
                            )}
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