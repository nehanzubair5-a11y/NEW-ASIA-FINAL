import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types.ts';
import Spinner from '../shared/Spinner.tsx';
import { useData } from '../../hooks/useData.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: Omit<User, '_id'>, isEditing: boolean) => void;
    user: User | null;
    isSaving: boolean;
    canUpdateUserProfile: boolean;
    canUpdateUserRole: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, user, isSaving, canUpdateUserProfile, canUpdateUserRole }) => {
    const { user: currentUser } = useAuth();
    const { roles } = useAppContext();
    const { dealers } = useData();
    const blankForm: Omit<User, '_id'> = {
        name: '',
        email: '',
        role: 'Booking Manager', // Default role
        password: '',
        dealerId: undefined,
        phone: '',
        whatsapp: '',
        address: '',
    };
    const [formData, setFormData] = useState(blankForm);
    const [showDealerSelect, setShowDealerSelect] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (user) {
                setFormData({
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    dealerId: user.dealerId,
                    phone: user.phone || '',
                    whatsapp: user.whatsapp || '',
                    address: user.address || '',
                });
                setShowDealerSelect(user.role === 'Dealer');
            } else {
                setFormData(blankForm);
                setShowDealerSelect(false);
            }
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'role') {
            const isDealerRole = value === 'Dealer';
            setShowDealerSelect(isDealerRole);
            setFormData(prev => ({ 
                ...prev, 
                role: value,
                dealerId: isDealerRole ? (dealers[0]?._id || '') : undefined,
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData, !!user);
    };
    
    // Admins cannot edit Super Admins
    const isEditingProtectedUser = user && user.role === 'Super Admin' && currentUser?.role === 'Admin';
    const canSaveChanges = (canUpdateUserProfile || canUpdateUserRole) && !isEditingProtectedUser;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-semibold text-gray-800">{user ? 'Edit User' : 'Add New User'}</h3>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required disabled={user ? !canUpdateUserProfile : false} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 disabled:bg-slate-100" />
                            </div>
                             <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required disabled={user ? !canUpdateUserProfile : false} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 disabled:bg-slate-100" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Contact Number</label>
                                <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} disabled={user ? !canUpdateUserProfile : false} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 disabled:bg-slate-100" />
                            </div>
                            <div>
                                <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                                <input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleChange} disabled={user ? !canUpdateUserProfile : false} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 disabled:bg-slate-100" />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                            <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} disabled={user ? !canUpdateUserProfile : false} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 disabled:bg-slate-100" />
                        </div>
                        {!user && (
                             <div>
                                <label htmlFor="password-2" className="block text-sm font-medium text-gray-700">Password</label>
                                <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required={!user} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2" />
                            </div>
                        )}
                        <div>
                             <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                             <select name="role" id="role" value={formData.role} onChange={handleChange} required disabled={user ? !canUpdateUserRole : false} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 disabled:bg-slate-100">
                                {roles.map(r => (
                                    <option key={r._id} value={r.name} disabled={r.name === 'Super Admin' && currentUser?.role !== 'Super Admin'}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                        {showDealerSelect && (
                            <div className="animate-fade-in">
                                <label htmlFor="dealerId" className="block text-sm font-medium text-gray-700">Associated Dealer</label>
                                <select name="dealerId" id="dealerId" value={formData.dealerId} onChange={handleChange} required disabled={user ? !canUpdateUserRole : false} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 disabled:bg-slate-100">
                                    {dealers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                        )}
                        {isEditingProtectedUser && <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">Super Admin profiles cannot be modified by Admins.</p>}
                    </div>
                    <div className="px-6 py-4 bg-gray-50 text-right space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSaving || !canSaveChanges} className="w-28 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                           {isSaving ? <Spinner /> : 'Save User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;