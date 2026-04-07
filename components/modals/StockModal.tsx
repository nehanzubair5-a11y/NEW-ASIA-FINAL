import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../hooks/useData.ts';
import Spinner from '../shared/Spinner.tsx';
import { StockItem, StockStatus } from '../../types.ts';

interface StockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (stockData: Omit<StockItem, '_id' | 'assignedAt'>) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// VIN validation function
const validateVin = (vin: string, existingVins: Set<string>): string => {
    if (!vin) {
        return 'VIN is required.';
    }
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
    if (vin.length !== 17) {
        return 'VIN must be exactly 17 characters long.';
    }
    if (!vinRegex.test(vin)) {
        return 'VIN contains invalid characters (I, O, Q are not allowed).';
    }
    if (existingVins.has(vin.toUpperCase())) {
        return 'This VIN already exists in the system.';
    }
    return '';
};


const StockModal: React.FC<StockModalProps> = ({ isOpen, onClose, onSave, showToast }) => {
    // FIX: Correctly destructure from useData() hook.
    const { products, dealers, stock } = useData();
    const [vin, setVin] = useState('');
    const [vinError, setVinError] = useState('');
    const [variantId, setVariantId] = useState('');
    const [dealerId, setDealerId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const existingVins = useMemo(() => new Set(stock.map(item => item.vin.toUpperCase())), [stock]);

    useEffect(() => {
        if (isOpen) {
            // Set default variant if available
            if (products.length > 0 && products[0].variants.length > 0) {
                setVariantId(products[0].variants[0]._id);
            }
        } else {
            // Reset form on close
            setVin('');
            setVinError('');
            setVariantId('');
            setDealerId(null);
        }
    }, [isOpen, products]);

    const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVin = e.target.value;
        setVin(newVin);
        setVinError(validateVin(newVin, existingVins));
    };


    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalError = validateVin(vin, existingVins);
        if (finalError) {
            setVinError(finalError);
            showToast(finalError, 'error');
            return;
        }
        if (!variantId) {
            showToast('Please select a product variant.', 'error');
            return;
        }
        setIsSaving(true);
        await onSave({
            vin: vin.toUpperCase(),
            variantId,
            dealerId,
            status: StockStatus.Available,
        });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-semibold text-gray-800">Add New Stock Item</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="vin" className="block text-sm font-medium text-gray-700">Vehicle Identification Number (VIN)</label>
                            <input
                                type="text"
                                id="vin"
                                value={vin}
                                onChange={handleVinChange}
                                required
                                maxLength={17}
                                className={`mt-1 block w-full shadow-sm sm:text-sm p-2 ${vinError ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'} rounded-md`}
                                autoFocus
                            />
                            {vinError && <p className="mt-1 text-xs text-red-600">{vinError}</p>}
                        </div>
                        <div>
                            <label htmlFor="variantId" className="block text-sm font-medium text-gray-700">Product Variant</label>
                            <select
                                id="variantId"
                                value={variantId}
                                onChange={(e) => setVariantId(e.target.value)}
                                required
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                            >
                                <option value="" disabled>Select a variant</option>
                                {products.map(p => (
                                    <optgroup label={`${p.brand} ${p.modelName}`} key={p._id}>
                                        {p.variants.map(v => (
                                            <option key={v._id} value={v._id}>{v.name} ({v.color})</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dealerId" className="block text-sm font-medium text-gray-700">Initial Holder</label>
                            <select
                                id="dealerId"
                                value={dealerId === null ? 'central' : dealerId}
                                onChange={(e) => setDealerId(e.target.value === 'central' ? null : e.target.value)}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                            >
                                <option value="central">Central Stock</option>
                                {dealers.map(d => (
                                    <option key={d._id} value={d._id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 text-right space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSaving || !!vinError} className="w-32 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                            {isSaving ? <Spinner /> : 'Add Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockModal;
