import React, { useState, useEffect } from 'react';
import type { Dealer } from '../../types.ts';
import Spinner from '../shared/Spinner.tsx';

// Add a simple email validation function
const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

interface DealerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (dealerData: Omit<Dealer, '_id' | 'createdAt' | 'registrationApproved'>, isEditing: boolean) => void;
    dealer: Dealer | null;
    isSaving: boolean;
}

const DealerModal: React.FC<DealerModalProps> = ({ isOpen, onClose, onSave, dealer, isSaving }) => {
    const blankForm = {
        name: '',
        ownerName: '',
        phone: '',
        email: '',
        city: '',
        reputationScore: 5.0,
    };
    const [formData, setFormData] = useState(blankForm);
    const [emailError, setEmailError] = useState(''); // New state for email error

    useEffect(() => {
        if (isOpen) {
            setEmailError(''); // Reset error on open
            if (dealer) {
                setFormData({
                    name: dealer.name,
                    ownerName: dealer.ownerName,
                    phone: dealer.phone,
                    email: dealer.email,
                    city: dealer.city,
                    reputationScore: dealer.reputationScore,
                });
            } else {
                setFormData(blankForm);
            }
        }
    }, [dealer, isOpen]);
    
    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        
        if (name === 'email') {
            if (value && !validateEmail(value)) {
                setEmailError('Please enter a valid email address.');
            } else {
                setEmailError('');
            }
        }

        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'number' ? parseFloat(value) : value 
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Final validation check on submit
        if (!validateEmail(formData.email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }
        if (emailError) {
            return; // Don't submit if there's a known error
        }
        onSave(formData, !!dealer);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b dark:border-slate-700">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-slate-100">{dealer ? 'Edit Dealer' : 'Add New Dealer'}</h3>
                    </div>
                    <div className="p-6 space-y-4 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Dealer Name</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                            </div>
                            <div>
                                <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Owner Name</label>
                                <input type="text" name="ownerName" id="ownerName" value={formData.ownerName} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
                            <input 
                                type="text" 
                                name="email" 
                                id="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                required 
                                className={`mt-1 block w-full shadow-sm sm:text-sm rounded-md p-2 bg-white dark:bg-slate-700 ${emailError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-slate-600'}`} 
                            />
                            {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Phone</label>
                                <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                            </div>
                             <div>
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-slate-300">City</label>
                                <input type="text" name="city" id="city" value={formData.city} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="reputationScore" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Reputation Score</label>
                            <input type="number" name="reputationScore" id="reputationScore" value={formData.reputationScore} onChange={handleChange} required min="0" max="10" step="0.1" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 text-right space-x-2 border-t dark:border-slate-700">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
                        <button type="submit" disabled={isSaving || !!emailError} className="w-28 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                           {isSaving ? <Spinner /> : 'Save Dealer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DealerModal;