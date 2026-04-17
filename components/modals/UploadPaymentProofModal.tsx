import React, { useState, useRef } from 'react';
import { StockOrder } from '../../types.ts';
import { XIcon, UploadIcon } from '../icons/Icons.tsx';
import Spinner from '../shared/Spinner.tsx';

interface UploadPaymentProofModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: StockOrder | null;
    onUpload: (orderId: string, base64Image: string) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const UploadPaymentProofModal: React.FC<UploadPaymentProofModalProps> = ({ isOpen, onClose, order, onUpload, showToast }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !order) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast("Image size must be less than 5MB", "error");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!previewImage) {
            showToast("Please select an image first", "error");
            return;
        }
        setIsUploading(true);
        try {
            await onUpload(order._id, previewImage);
            showToast("Payment proof uploaded successfully!", "success");
            onClose();
            setPreviewImage(null);
        } catch (error) {
            showToast("Failed to upload payment proof.", "error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-slate-900 dark:text-slate-100" id="modal-title">
                                Upload Payment Proof
                            </h3>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300">
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="mt-2">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                Upload a receipt or screenshot of your payment for order #{order._id.slice(-6)}.
                            </p>
                            
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    {previewImage ? (
                                        <div className="relative">
                                            <img src={previewImage} alt="Preview" className="mx-auto h-48 object-contain" />
                                            <button 
                                                onClick={() => setPreviewImage(null)}
                                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                            <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-primary hover:text-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                                                    <span>Upload a file</span>
                                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                PNG, JPG, GIF up to 5MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleUpload}
                            disabled={isUploading || !previewImage}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                            {isUploading ? <Spinner className="w-5 h-5 text-white" /> : 'Upload'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadPaymentProofModal;
