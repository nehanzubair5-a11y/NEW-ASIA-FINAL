import React, { useState, useMemo, useEffect } from 'react';
import { Booking, StockItem, StockStatus } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import Spinner from '../shared/Spinner.tsx';

interface AllocateStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AllocateStockModal: React.FC<AllocateStockModalProps> = ({ isOpen, onClose, booking, showToast }) => {
    const { stock, allocateStockToBooking } = useData();
    const [selectedStockItemId, setSelectedStockItemId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const availableStock = useMemo(() => {
        if (!booking) return [];
        return stock.filter(item => 
            item.variantId === booking.variantId &&
            item.status === StockStatus.Available &&
            item.dealerId === null // Only from central stock
        );
    }, [stock, booking]);

    useEffect(() => {
        if (isOpen) {
            setSelectedStockItemId(''); // Reset on open
        }
    }, [isOpen]);

    if (!isOpen || !booking) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStockItemId) {
            showToast('Please select a vehicle to allocate.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await allocateStockToBooking(booking._id, selectedStockItemId);
            showToast('Vehicle successfully allocated to booking.', 'success');
            onClose();
        } catch (error) {
            showToast('Failed to allocate stock.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b dark:border-slate-700">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Allocate Stock to Booking</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">For customer: {booking.customerName}</p>
                    </div>
                    <div className="p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                        {availableStock.length > 0 ? (
                            <div>
                                <label htmlFor="stockItemId" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Select Available Vehicle (VIN)</label>
                                <select 
                                    id="stockItemId" 
                                    name="stockItemId"
                                    value={selectedStockItemId}
                                    onChange={(e) => setSelectedStockItemId(e.target.value)}
                                    required
                                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-700"
                                >
                                    <option value="" disabled>Select a VIN...</option>
                                    {availableStock.map(item => (
                                        <option key={item._id} value={item._id}>{item.vin}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="p-4 text-center bg-yellow-50 border border-yellow-200 rounded-md">
                                <p className="text-sm font-medium text-yellow-800">No available stock</p>
                                <p className="text-xs text-yellow-700 mt-1">There are no units of this variant available in the central stock.</p>
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 text-right space-x-2 border-t dark:border-slate-700">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
                        <button type="submit" disabled={isSaving || !selectedStockItemId || availableStock.length === 0} className="w-36 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                            {isSaving ? <Spinner /> : 'Allocate Vehicle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AllocateStockModal;