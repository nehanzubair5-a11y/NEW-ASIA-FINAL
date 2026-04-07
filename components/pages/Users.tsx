import React, { useState, useMemo } from 'react';
import { User, Page } from '../../types.ts';
import { PlusIcon, EditIcon, UsersIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, ChevronsUpDownIcon, PrintIcon } from '../icons/Icons.tsx';
import UserModal from '../modals/UserModal.tsx';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import Tooltip from '../shared/Tooltip.tsx';
import Spinner from '../shared/Spinner.tsx';
import usePagination from '../../hooks/usePagination.ts';
import Pagination from '../shared/Pagination.tsx';
import EmptyState from '../shared/EmptyState.tsx';
import { useData } from '../../hooks/useData.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import ConfirmModal from '../modals/ConfirmModal.tsx';
import { printElementById } from '../../utils/print.ts';

type SortableKey = 'name' | 'role' | 'dealerName';
type SortDirection = 'ascending' | 'descending';

const Users: React.FC<{
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}> = ({ showToast }) => {
    const { users, roles, addUser, updateUser, deleteUser } = useAppContext();
    const { dealers } = useData();
    const { user: currentUser } = useAuth();
    const { canCreateUser, canUpdateUser, canDeleteUser, canViewUserActions, canUpdateUserProfile, canUpdateUserRole } = usePermissions();

    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: SortDirection } | null>({ key: 'name', direction: 'ascending' });

    const filteredUsers = useMemo(() => {
        let tempUsers = [...users];

        if (roleFilter !== 'all') {
            tempUsers = tempUsers.filter(u => u.role === roleFilter);
        }
        
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            tempUsers = tempUsers.filter(u =>
                u.name.toLowerCase().includes(lowercasedQuery) ||
                u.email.toLowerCase().includes(lowercasedQuery)
            );
        }
        return tempUsers;
    }, [users, searchQuery, roleFilter]);

    const sortedUsers = useMemo(() => {
        let sortableItems = [...filteredUsers];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: string | undefined;
                let bValue: string | undefined;

                if (sortConfig.key === 'dealerName') {
                    aValue = dealers.find(d => d._id === a.dealerId)?.name;
                    bValue = dealers.find(d => d._id === b.dealerId)?.name;
                } else {
                    aValue = a[sortConfig.key as keyof User] as string;
                    bValue = b[sortConfig.key as keyof User] as string;
                }

                if (!aValue) aValue = '';
                if (!bValue) bValue = '';

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredUsers, sortConfig, dealers]);


    const { paginatedData, currentPage, totalPages, nextPage, prevPage, setCurrentPage } = usePagination(sortedUsers, 10);
    
    const requestSort = (key: SortableKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setModalOpen(true);
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        try {
            await deleteUser(userToDelete._id);
            showToast('User deleted successfully!', 'success');
        } catch (error) {
            showToast('Failed to delete user.', 'error');
        }
        setUserToDelete(null);
        setConfirmOpen(false);
    };

    const handleAddNew = () => {
        setSelectedUser(null);
        setModalOpen(true);
    };

    const handleSave = async (userData: Omit<User, '_id'>, isEditing: boolean) => {
        setIsSaving(true);
        try {
            if (isEditing && selectedUser) {
                await updateUser({ ...selectedUser, ...userData });
                showToast('User updated successfully!', 'success');
            } else {
                await addUser(userData);
                showToast('New user created!', 'success');
            }
        } catch (error) {
            showToast('Failed to save user.', 'error');
        } finally {
            setModalOpen(false);
            setIsSaving(false);
        }
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setRoleFilter('all');
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'Super Admin': return 'bg-red-100 text-red-800';
            case 'Admin': return 'bg-blue-100 text-blue-800';
            case 'Dealer': return 'bg-green-100 text-green-800';
            case 'Finance / Auditor': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const SortIndicator = ({ columnKey }: { columnKey: SortableKey }) => {
        if (!sortConfig || sortConfig.key !== columnKey) {
            return <ChevronsUpDownIcon className="w-4 h-4 text-slate-400" />;
        }
        if (sortConfig.direction === 'ascending') {
            return <ChevronUpIcon className="w-4 h-4" />;
        }
        return <ChevronDownIcon className="w-4 h-4" />;
    };

    return (
        <div id="users-page-content" className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h2 className="text-3xl font-bold text-slate-800">User Management</h2>
                <div className="flex items-center space-x-2">
                    <Tooltip content="Print Current View">
                        <button onClick={() => printElementById('users-page-content')} className="flex items-center justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                            <PrintIcon />
                        </button>
                    </Tooltip>
                    {canCreateUser && (
                        <button onClick={handleAddNew} className="flex items-center justify-center w-36 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                            <PlusIcon />
                            <span>Add New User</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 no-print">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-wrap w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <input 
                            type="text" 
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full md:w-64 pl-10 pr-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary"
                        />
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                     <div className="flex items-center w-full md:w-auto">
                        <label className="text-sm font-medium text-slate-600 mr-2 shrink-0">Role:</label>
                        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }} className="w-full md:w-40 p-2 border border-slate-300 rounded-md shadow-sm text-sm">
                            <option value="all">All Roles</option>
                            {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                        </select>
                    </div>
                </div>
                 <button onClick={handleClearFilters} className="w-full md:w-auto py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                    Clear Filters
                </button>
            </div>

             <div className="hidden print-only">
                <h1 className="text-2xl font-bold mb-1">Users List</h1>
                <p className="text-sm text-slate-600 mb-4">Generated on: {new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100/80">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                     <button onClick={() => requestSort('name')} className="flex items-center space-x-1 group">
                                        <span>User</span>
                                        <SortIndicator columnKey="name" />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                     <button onClick={() => requestSort('role')} className="flex items-center space-x-1 group">
                                        <span>Role</span>
                                        <SortIndicator columnKey="role" />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                     <button onClick={() => requestSort('dealerName')} className="flex items-center space-x-1 group">
                                        <span>Associated Dealer</span>
                                        <SortIndicator columnKey="dealerName" />
                                    </button>
                                </th>
                                {canViewUserActions && 
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider no-print">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {paginatedData.map(user => {
                                const dealer = user.dealerId ? dealers.find(d => d._id === user.dealerId) : null;
                                const isCurrentUser = user._id === currentUser?._id;

                                return (
                                    <tr key={user._id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">{user.name} {isCurrentUser && '(You)'}</div>
                                            <div className="text-sm text-slate-500">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>{user.role}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{dealer?.name || 'N/A'}</td>
                                        {canViewUserActions && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 no-print">
                                                <Tooltip content="Edit User Details">
                                                    <button 
                                                        onClick={() => handleEdit(user)} 
                                                        className="text-indigo-600 hover:text-indigo-900 transition-colors p-1 rounded-full hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={!canUpdateUser(user)}
                                                    >
                                                        <EditIcon />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Delete User">
                                                    <button
                                                        onClick={() => handleDeleteClick(user)}
                                                        className="text-red-600 hover:text-red-900 transition-colors p-1 rounded-full hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        disabled={!canDeleteUser(user)}
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </Tooltip>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onNext={nextPage} onPrev={prevPage} />
            </div>
            <UserModal 
                isOpen={isModalOpen} 
                onClose={() => setModalOpen(false)} 
                onSave={handleSave} 
                user={selectedUser} 
                isSaving={isSaving}
                canUpdateUserProfile={canUpdateUserProfile}
                canUpdateUserRole={canUpdateUserRole}
            />
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete User"
                message={`Are you sure you want to delete the user "${userToDelete?.name}"? This action cannot be undone.`}
            />
        </div>
    );
};

export default Users;