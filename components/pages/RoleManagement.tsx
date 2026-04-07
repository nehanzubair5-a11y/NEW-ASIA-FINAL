import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { PlusIcon, EditIcon, UsersIcon, PrintIcon, ShieldIcon } from '../icons/Icons.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import { Role } from '../../types.ts';
import RoleModal from '../modals/RoleModal.tsx';
import Tooltip from '../shared/Tooltip.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { printElementById } from '../../utils/print.ts';

const RoleManagement: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { roles, users, addRole, updateRole } = useAppContext();
    const { canManageRoles } = usePermissions();
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const rolesWithUserCounts = useMemo(() => {
        return roles.map(role => ({
            ...role,
            userCount: users.filter(u => u.role === role.name).length
        }));
    }, [roles, users]);

    const handleAddNew = () => {
        setSelectedRole(null);
        setModalOpen(true);
    };

    const handleEdit = (role: Role) => {
        setSelectedRole(role);
        setModalOpen(true);
    };

    const handleSave = async (roleData: Omit<Role, '_id'>, isEditing: boolean) => {
        setIsSaving(true);
        try {
            if (isEditing && selectedRole) {
                await updateRole({ ...selectedRole, ...roleData });
                showToast('Role updated successfully!', 'success');
            } else {
                await addRole(roleData);
                showToast('New role created!', 'success');
            }
        } catch (error) {
            showToast('Failed to save role.', 'error');
        } finally {
            setIsSaving(false);
            setModalOpen(false);
        }
    };
    
    return (
        <div id="roles-page-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Roles & Permissions</h2>
                <div className="flex items-center space-x-4">
                    <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('roles-page-content')} className="flex items-center justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <PrintIcon />
                        </button>
                    </Tooltip>
                    {canManageRoles && (
                        <button onClick={handleAddNew} className="flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                            <PlusIcon />
                            <span>Add New Role</span>
                        </button>
                    )}
                </div>
            </div>

             <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Roles & Permissions</h1>
                <p className="text-sm text-slate-600 mb-4">Generated on: {new Date().toLocaleDateString()}</p>
            </div>
            
            {rolesWithUserCounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rolesWithUserCounts.map(role => (
                        <div key={role._id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 flex flex-col border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                           <div className="flex justify-between items-start mb-4">
                               <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{role.name}</h3>
                                <Tooltip content={role.isEditable ? "Edit Role" : "This role cannot be edited"}>
                                    <button onClick={() => handleEdit(role)} disabled={!role.isEditable} className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-slate-700">
                                        <EditIcon />
                                    </button>
                                </Tooltip>
                           </div>
                           <div className="flex-grow space-y-4">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600">
                                        <ShieldIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{role.permissions.length}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Permissions Granted</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                     <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-100 text-green-600">
                                        <UsersIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{role.userCount}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Users Assigned</p>
                                    </div>
                                </div>
                           </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <EmptyState 
                        icon={<UsersIcon className="w-12 h-12" />}
                        title="No Custom Roles Found"
                        message="Create custom roles to define granular access for your users."
                    />
                </div>
            )}

            <RoleModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} isSaving={isSaving} role={selectedRole} />
        </div>
    );
};

export default RoleManagement;