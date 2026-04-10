import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import Spinner from '../shared/Spinner.tsx';
import { User } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import StatCard from '../shared/StatCard.tsx';
import { CalendarIcon, BoxIcon, PrintIcon, AlertTriangleIcon } from '../icons/Icons.tsx';
import { printElementById } from '../../utils/print.ts';

const Profile: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { user: currentUser, updateCurrentUser } = useAuth();
    const { updateUser, deviceSessions, auditLogs } = useAppContext();
    const { dealers, bookings, stock } = useData();
    
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', whatsapp: '', address: '', avatarUrl: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name,
                email: currentUser.email,
                phone: currentUser.phone || '',
                whatsapp: currentUser.whatsapp || '',
                address: currentUser.address || '',
                avatarUrl: currentUser.avatarUrl || '',
            });
        }
    }, [currentUser]);

    const handleGenerateAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
        const newAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
        setFormData(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
    };

    const associatedDealer = useMemo(() => {
        if (currentUser?.role === 'Dealer' && currentUser.dealerId) {
            return dealers.find(d => d._id === currentUser.dealerId);
        }
        return null;
    }, [currentUser, dealers]);

    const currentSession = useMemo(() => {
        return deviceSessions.find(s => s.isCurrent);
    }, [deviceSessions]);
    
    const userActivity = useMemo(() => {
        if (!currentUser) return [];
        return auditLogs.filter(log => log.userId === currentUser._id).slice(0, 5);
    }, [auditLogs, currentUser]);

    const dealerStats = useMemo(() => {
        if (currentUser?.role !== 'Dealer' || !currentUser.dealerId) return null;
        
        const myBookings = bookings.filter(b => b.dealerId === currentUser.dealerId);
        const myStock = stock.filter(s => s.dealerId === currentUser.dealerId && s.status === 'Available');

        return {
            totalBookings: myBookings.length,
            availableStock: myStock.length
        };
    }, [currentUser, bookings, stock]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({...prev, [name]: value}));
        setPasswordError('');
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsSaving(true);
        try {
            const updatedUserData: User = { ...currentUser, ...formData };
            await updateUser(updatedUserData);
            updateCurrentUser(updatedUserData);
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            showToast('Failed to update profile.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        if (passwordData.newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters long.');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }
        
        setIsSavingPassword(true);
        setTimeout(() => {
            setIsSavingPassword(false);
            showToast('Password updated successfully!', 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }, 1500);
    };

    if (!currentUser) {
        return <div>Loading profile...</div>;
    }

    return (
        <div id="profile-page-content" className="space-y-8 max-w-6xl mx-auto">
             <div className="flex justify-between items-start">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center text-4xl font-bold flex-shrink-0 shadow-md overflow-hidden">
                        {formData.avatarUrl ? (
                            <img src={formData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            currentUser.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h2 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">{currentUser.role}</p>
                        <button type="button" onClick={handleGenerateAvatar} className="mt-2 text-sm text-primary hover:text-secondary font-medium transition-colors">
                            Generate New Avatar
                        </button>
                    </div>
                </div>
                <div className="no-print">
                    <button onClick={() => printElementById('profile-page-content')} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                        <PrintIcon />
                        <span>Print Profile</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">Personal Information</h3>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contact Number</label>
                                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                                </div>
                                <div>
                                    <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp Number</label>
                                    <input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                                    <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                                </div>
                            </div>
                            <div className="text-right pt-4">
                                <button type="submit" disabled={isSaving} className="w-36 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                                {isSaving ? <Spinner /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">Security</h3>
                        {currentSession && (
                            <div className="mb-6">
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">Current Session</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{currentSession.os} &middot; {currentSession.userAgent} &middot; IP: {currentSession.ip}</p>
                            </div>
                        )}
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">Change Password</h4>
                        <form onSubmit={handlePasswordUpdate} className="space-y-4 mt-2">
                            {passwordError && (
                                <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700 flex items-center">
                                    <AlertTriangleIcon className="w-5 h-5 mr-3"/>
                                    <span className="text-sm">{passwordError}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                                    <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
                                    <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-700" />
                                </div>
                            </div>
                            <div className="text-right pt-4">
                                <button type="submit" disabled={isSavingPassword} className="w-40 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                                {isSavingPassword ? <Spinner/> : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">Recent Activity</h3>
                        {userActivity.length > 0 ? (
                            <ul className="space-y-4 divide-y divide-slate-100 dark:divide-slate-700">
                                {userActivity.map(log => (
                                    <li key={log._id} className="pt-4 first:pt-0 flex flex-col space-y-1">
                                        <div className="flex justify-between items-start">
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {log.action} {log.targetCollection ? `on ${log.targetCollection}` : ''}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        {log.changes && <span className="text-sm text-slate-600 dark:text-slate-400">{log.changes}</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity found.</p>
                        )}
                    </div>
                </div>

                {associatedDealer && dealerStats && (
                     <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">My Performance</h3>
                            <div className="space-y-4">
                                <StatCard title="Total Customer Bookings" value={dealerStats.totalBookings.toString()} icon={<CalendarIcon />} color="bg-green-500" />
                                <StatCard title="Available Stock Units" value={dealerStats.availableStock.toString()} icon={<BoxIcon />} color="bg-indigo-500" />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">My Dealership</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="font-medium text-slate-500 dark:text-slate-400">Name:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{associatedDealer.name}</span></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-500 dark:text-slate-400">Owner:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{associatedDealer.ownerName}</span></div>
                                <div className="flex justify-between"><span className="font-medium text-slate-500 dark:text-slate-400">City:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{associatedDealer.city}</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;