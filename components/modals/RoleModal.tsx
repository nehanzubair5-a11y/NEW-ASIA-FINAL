import React, { useState, useEffect } from 'react';
import { Role } from '../../types.ts';
import Spinner from '../shared/Spinner.tsx';
import { PERMISSIONS, Permission } from '../../permissions.ts';

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (roleData: Omit<Role, '_id'>, isEditing: boolean) => void;
    role: Role | null;
    isSaving: boolean;
}

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, role, isSaving }) => {
    const blankForm = { name: '', permissions: [], isEditable: true };
    const [formData, setFormData] = useState(blankForm);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            if (role) {
                setFormData({ name: role.name, permissions: [...role.permissions], isEditable: role.isEditable });
            } else {
                setFormData(blankForm);
            }
        } else {
            setTimeout(() => setIsVisible(false), 200);
        }
    }, [role, isOpen]);

    if (!isVisible) return null;

    const handlePermissionChange = (permission: Permission, isChecked: boolean) => {
        setFormData(prev => {
            const newPermissions = isChecked
                ? [...prev.permissions, permission]
                : prev.permissions.filter(p => p !== permission);
            return { ...prev, permissions: newPermissions };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData, !!role);
    };
    
    const permissionCategories = Object.keys(PERMISSIONS).reduce((acc, key) => {
        const category = key.split(':')[0];
        if (!acc[category]) acc[category] = [];
        acc[category].push(key as Permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start sm:items-center p-0 sm:p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}>
            <div className={`bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-3xl flex flex-col transform transition-transform duration-200 ${isOpen ? 'scale-100' : 'scale-95'}`} onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-semibold text-gray-800">{role ? 'Edit Role' : 'Add New Role'}</h3>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Role Name</label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(p => ({...p, name: e.target.value}))}
                                required
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                            />
                        </div>
                        <div className="pt-2">
                             <h4 className="block text-sm font-medium text-gray-700 mb-2">Permissions</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(permissionCategories).map(([category, perms]) => (
                                    <div key={category} className="p-4 border rounded-md bg-slate-50">
                                        <h5 className="font-semibold capitalize text-slate-800 mb-3">{category.replace('_', ' ')}</h5>
                                        <div className="space-y-2">
                                            {perms.map(permission => (
                                                 <label key={permission} className="flex items-center space-x-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.permissions.includes(permission)}
                                                        onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-sm text-slate-600">{PERMISSIONS[permission]}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 text-right space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSaving} className="w-28 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                           {isSaving ? <Spinner /> : 'Save Role'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleModal;