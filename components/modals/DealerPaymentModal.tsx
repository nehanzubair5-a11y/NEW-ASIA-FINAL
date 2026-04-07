import React, { useState, useMemo, useEffect } from 'react';
import { PaymentType, OrderStatus } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import Spinner from '../shared/Spinner.tsx';
import { UploadCloudIcon, XCircleIcon } from '../icons/Icons.tsx';

interface DealerPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    dealerId?: string; // Make dealerId optional
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const DealerPaymentModal: React.FC<DealerPaymentModalProps> = ({ isOpen, onClose, dealerId, showToast }) => {
    const { addDealerPayment, stockOrders, dealers } = useData();
    const [selectedDealerId, setSelectedDealerId] = useState(dealerId || '');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<PaymentType>(PaymentType.BankTransfer);
    const [reference, setReference] = useState('');
    const [stockOrderId, setStockOrderId] = useState<string | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedDealerId(dealerId || (dealers.length > 0 ? dealers[0]._id : ''));
            setAmount('');
            setType(PaymentType.BankTransfer);
            setReference('');
            setStockOrderId(undefined);
            setProofFile(null);
            setIsDragging(false);
        }
    }, [isOpen, dealerId, dealers]);


    const relevantOrders = useMemo(() => {
        if (!selectedDealerId) return [];
        return stockOrders.filter(order =>
            order.dealerId === selectedDealerId &&
            (order.status === OrderStatus.Approved || order.status === OrderStatus.PartiallyApproved || order.status === OrderStatus.Dispatched)
        );
    }, [stockOrders, selectedDealerId]);

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            showToast("Please enter a valid payment amount.", "error");
            return;
        }
        if (!selectedDealerId) {
            showToast("Please select a dealer.", "error");
            return;
        }
        setIsSaving(true);
        try {
            let proofOfPayment = undefined;
            if (proofFile) {
                proofOfPayment = await convertToBase64(proofFile);
            }

            await addDealerPayment({
                dealerId: selectedDealerId,
                amount: Number(amount),
                type,
                reference,
                stockOrderId: stockOrderId || undefined,
                proofOfPayment,
            });
            showToast("Payment recorded successfully!", "success");
            onClose();
        } catch (error) {
            showToast("Failed to record payment.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProofFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                setProofFile(file);
            } else {
                showToast("Please upload an image file.", "error");
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-semibold text-gray-800">Record Dealer Payment</h3>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                         {!dealerId && (
                             <div>
                                <label htmlFor="dealerSelect" className="block text-sm font-medium text-gray-700">Dealer</label>
                                 <select
                                    id="dealerSelect"
                                    value={selectedDealerId}
                                    onChange={(e) => setSelectedDealerId(e.target.value)}
                                    required
                                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                                >
                                    <option value="" disabled>Select a dealer...</option>
                                    {dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                         )}
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (PKR)</label>
                            <input
                                type="number"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                                min="1"
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Payment Type</label>
                                <select
                                    id="type"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as PaymentType)}
                                    required
                                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                                >
                                    {Object.values(PaymentType).map(t => <option key={t} value={t}>{String(t).replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="stockOrderId" className="block text-sm font-medium text-gray-700">Link to Order (Optional)</label>
                                <select
                                    id="stockOrderId"
                                    value={stockOrderId || ''}
                                    onChange={(e) => setStockOrderId(e.target.value || undefined)}
                                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                                    disabled={!selectedDealerId}
                                >
                                    <option value="">None</option>
                                    {relevantOrders.map(order => (
                                        <option key={order._id} value={order._id}>
                                            Order #{order._id.slice(-6)} - {new Date(order.requestTimestamp).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="reference" className="block text-sm font-medium text-gray-700">Reference / Notes</label>
                            <input
                                type="text"
                                id="reference"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="e.g., Invoice #, Cheque #"
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Proof of Payment (Image)</label>
                            <div 
                                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md relative transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {proofFile ? (
                                    <div className="text-center">
                                        <p className="text-sm text-gray-900 font-medium truncate max-w-xs">{proofFile.name}</p>
                                        <button 
                                            type="button" 
                                            onClick={() => setProofFile(null)} 
                                            className="mt-2 inline-flex items-center text-xs text-red-600 hover:text-red-800"
                                        >
                                            <XCircleIcon className="w-4 h-4 mr-1" /> Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1 text-center">
                                        <UploadCloudIcon className={`mx-auto h-12 w-12 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 text-right space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSaving} className="w-36 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                            {isSaving ? <Spinner /> : 'Save Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DealerPaymentModal;