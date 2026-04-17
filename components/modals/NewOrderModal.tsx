import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import type { StockOrderItem } from '../../types.ts';
import { StockStatus } from '../../types.ts';
import { PlusIcon, XCircleIcon } from '../icons/Icons.tsx';
import Spinner from '../shared/Spinner.tsx';
import { useData } from '../../hooks/useData.ts';

interface NewOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, showToast }) => {
    const { products, createStockOrder, stock } = useData();
    const { isOnline, addToQueue } = useAppContext();
    const { user } = useAuth();
    const [orderItems, setOrderItems] = useState<(Partial<StockOrderItem> & { error?: string })[]>([{}]);
    const [proofOfPaymentUrl, setProofOfPaymentUrl] = useState<string>('');
    const [isVisible, setIsVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setOrderItems([{}]); // Reset form on open
            setProofOfPaymentUrl('');
        } else {
            setTimeout(() => setIsVisible(false), 200);
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofOfPaymentUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateItem = (item: Partial<StockOrderItem> & { error?: string }): string | undefined => {
        if (item.quantity === undefined || item.quantity === null) return undefined;

        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            return "Must be a positive number.";
        }

        if (!item.variantId) return undefined;

        const centralStockCount = stock.filter(
            s => s.variantId === item.variantId && s.dealerId === null && s.status === StockStatus.Available
        ).length;

        if (item.quantity > centralStockCount) {
            return `Exceeds stock (${centralStockCount} available).`;
        }

        return undefined;
    };


    const handleItemChange = (index: number, field: 'variantId' | 'quantity', value: string) => {
        const newItems = [...orderItems];
        const updatedItem = { ...newItems[index] };

        if (field === 'variantId') {
            const [productId, variantId] = value.split(',');
            updatedItem.productId = productId;
            updatedItem.variantId = variantId;
        } else {
            if (value === '') {
                updatedItem.quantity = undefined;
            } else {
                const num = parseInt(value, 10);
                if (!isNaN(num)) {
                    updatedItem.quantity = num;
                }
            }
        }

        updatedItem.error = validateItem(updatedItem);
        newItems[index] = updatedItem;
        setOrderItems(newItems);
    };

    const addItem = () => {
        setOrderItems(prev => [...prev, {}]);
    };

    const removeItem = (index: number) => {
        if (orderItems.length <= 1) return;
        setOrderItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validatedItems = orderItems.map(item => ({...item, error: validateItem(item)}));
        const hasErrors = validatedItems.some(item => item.quantity && item.quantity > 0 && item.error);

        if (hasErrors) {
            setOrderItems(validatedItems);
            showToast("Please fix the errors in your order.", "error");
            return;
        }

        const finalItems = validatedItems.filter(
            item => item.productId && item.variantId && item.quantity && item.quantity > 0
        ) as StockOrderItem[];

        if (finalItems.length === 0) {
            showToast("Please add at least one valid item to the order.", "error");
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const orderData = {
                dealerId: user!.dealerId!,
                items: finalItems,
                proofOfPaymentUrl: proofOfPaymentUrl || undefined,
            };
            
            if (isOnline) {
                await createStockOrder(orderData);
                showToast("Stock order submitted successfully!", "success");
            } else {
                addToQueue({ type: 'ADD_STOCK_ORDER', payload: orderData, timestamp: Date.now() });
                showToast("You are offline. Order added to sync queue.", "info");
            }
        } catch (error) {
            showToast("Failed to submit order.", "error");
        } finally {
            setIsSubmitting(false);
            onClose();
        }
    };

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start sm:items-center p-0 sm:p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
            <div className={`bg-white dark:bg-slate-800 rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-4xl flex flex-col transform transition-transform duration-200 ${isOpen ? 'scale-100' : 'scale-95'}`} onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Create New Stock Order</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Select products and quantities to request from New Asia central stock.</p>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
                        {orderItems.map((item, index) => {
                             const selectedVariant = item.variantId ? products.flatMap(p => p.variants).find(v => v._id === item.variantId) : null;
                             const centralStockCount = item.variantId ? stock.filter(s => s.variantId === item.variantId && s.dealerId === null && s.status === StockStatus.Available).length : 0;
                            return (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b md:border-b-0 border-slate-200 dark:border-slate-700 pb-4 md:pb-0">
                                    <div className="md:col-span-6">
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Product Variant</label>
                                        <select
                                            value={item.productId ? `${item.productId},${item.variantId}` : ''}
                                            onChange={e => handleItemChange(index, 'variantId', e.target.value)}
                                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                        >
                                            <option value="" disabled>Select a product...</option>
                                            {products.filter(p => p.isActive !== false).map(p => {
                                                const activeVariants = p.variants.filter(v => v.isActive !== false);
                                                if (activeVariants.length === 0) return null;
                                                return (
                                                    <optgroup label={`${p.brand} ${p.modelName}`} key={p._id}>
                                                        {activeVariants.map(v => (
                                                            <option key={v._id} value={`${p._id},${v._id}`}>{v.name}</option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Unit Price</label>
                                        <div className="mt-1 flex items-center h-10 px-2 bg-slate-100 dark:bg-slate-600 rounded-md border border-slate-200 dark:border-slate-500">
                                            <span className="text-sm text-slate-800 dark:text-slate-200 font-semibold">
                                                {selectedVariant ? `Rs. ${selectedVariant.price.toLocaleString()}` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <div className="flex justify-between items-baseline">
                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Quantity</label>
                                            {item.variantId && <span className="text-xs text-slate-500 dark:text-slate-400">Available: {centralStockCount}</span>}
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity ?? ''}
                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                            className={`mt-1 block w-full shadow-sm sm:text-sm rounded-md p-2 focus:ring-2 focus:ring-primary/50 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 ${item.error ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-slate-300 dark:border-slate-600 focus:border-primary'}`}
                                        />
                                         {item.error && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
                                    </div>
                                    <div className="md:col-span-1 pt-6 text-right flex justify-end">
                                        {orderItems.length > 1 && (
                                            <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-slate-600">
                                                <XCircleIcon />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        <button type="button" onClick={addItem} className="mt-4 flex items-center space-x-1 text-sm font-medium text-primary hover:underline">
                            <PlusIcon className="w-4 h-4" />
                            <span>Add Another Item</span>
                        </button>
                        
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Proof of Payment (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                            {proofOfPaymentUrl && (
                                <div className="mt-4 relative w-32 h-32 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <img src={proofOfPaymentUrl} alt="Proof of Payment" className="object-cover w-full h-full" />
                                    <button
                                        type="button"
                                        onClick={() => setProofOfPaymentUrl('')}
                                        className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm text-red-500 hover:text-red-700"
                                    >
                                        <XCircleIcon />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 text-right space-x-2 rounded-b-lg flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="w-36 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                            {isSubmitting ? <Spinner /> : 'Submit Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewOrderModal;