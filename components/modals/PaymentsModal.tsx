import React, { useState } from 'react';
// FIX: Import newly added Booking and Payment types.
import type { Booking, Payment } from '../../types.ts';
// FIX: Import newly added PaymentType enum.
import { PaymentType } from '../../types.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useData } from '../../hooks/useData.ts';

interface PaymentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PaymentsModal: React.FC<PaymentsModalProps> = ({ isOpen, onClose, booking, showToast }) => {
    // FIX: Get state/functions from their correct context.
    const { isOnline, addToQueue } = useAppContext();
    const { addPayment } = useData();
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<PaymentType>(PaymentType.Cash);

    if (!isOpen || !booking) return null;

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        const newPayment: Payment = {
            amount: Number(amount),
            type,
            timestamp: new Date().toISOString()
        };
        
        if (isOnline) {
            addPayment(booking._id, newPayment);
            showToast("Payment recorded successfully!", 'success');
        } else {
            addToQueue({ type: 'ADD_PAYMENT', payload: { bookingId: booking._id, payment: newPayment }, timestamp: Date.now() });
            showToast('You are offline. Payment added to sync queue.', 'info');
        }
        
        setAmount('');
        setType(PaymentType.Cash);
    };
    
    const totalPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start sm:items-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex-shrink-0">
                    <h3 className="text-xl font-semibold text-gray-800">Manage Payments</h3>
                    <p className="text-sm text-gray-500">For booking by {booking.customerName}</p>
                </div>
                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    {/* Payment History */}
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Payment History</h4>
                        <ul className="divide-y divide-gray-200 border rounded-md">
                            {booking.payments.length > 0 ? booking.payments.map((p, index) => (
                                <li key={index} className="p-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">Rs. {p.amount.toLocaleString()}</p>
                                        <p className="text-sm text-gray-500 capitalize">{p.type.replace('_', ' ')}</p>
                                    </div>
                                    <p className="text-sm text-gray-400">{new Date(p.timestamp).toLocaleString()}</p>
                                </li>
                            )) : (
                                <li className="p-3 text-center text-gray-500">No payments recorded yet.</li>
                            )}
                             <li className="p-3 flex justify-between items-center bg-gray-50 font-bold">
                                <span>Total Paid</span>
                                <span>Rs. {totalPaid.toLocaleString()}</span>
                            </li>
                        </ul>
                    </div>
                    {/* Add Payment Form */}
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-3 pt-4 border-t">Record New Payment</h4>
                        <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (PKR)</label>
                                <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary" />
                            </div>
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Payment Type</label>
                                <select id="type" value={type} onChange={(e) => setType(e.target.value as PaymentType)} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary">
                                    {Object.values(PaymentType).map(t => <option key={t} value={t} className="capitalize">{String(t).replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="py-2 px-4 w-full border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">Add Payment</button>
                        </form>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 text-right rounded-b-lg flex-shrink-0">
                    <button onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Close</button>
                </div>
            </div>
        </div>
    );
};

export default PaymentsModal;