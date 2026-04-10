import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  AuditLog, Notification, DeviceSession, SyncQueueItem,
  ActionType, User, BackupRecord, Settings, AppContextType, Role
} from '../types.ts';
import { MOCK_AUDIT_LOGS, MOCK_NOTIFICATIONS, MOCK_DEVICE_SESSIONS, MOCK_USERS } from '../constants.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { api } from '../api/index.ts';

const useStickyState = <T,>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [value, setValue] = useState<T>(() => {
        try {
            const stickyValue = window.localStorage.getItem(key);
            return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
        } catch {
            return defaultValue;
        }
    });
    useEffect(() => {
        window.localStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);
    return [value, setValue];
};

type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';

const initialSettings: Settings = {
    theme: 'light',
    notifications: {
        newOrder: true,
        orderApproved: true,
        orderRejected: true,
        lowStockWarning: true,
    }
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [users, setUsers] = useStickyState<User[]>(MOCK_USERS, 'dms-users');
    const [roles, setRoles] = useStickyState<Role[]>([], 'dms-roles');
    const [auditLogs, setAuditLogs] = useStickyState<AuditLog[]>(MOCK_AUDIT_LOGS, 'dms-auditLogs');
    const [notifications, setNotifications] = useStickyState<Notification[]>(MOCK_NOTIFICATIONS, 'dms-notifications');
    const [deviceSessions, setDeviceSessions] = useStickyState<DeviceSession[]>(MOCK_DEVICE_SESSIONS, 'dms-deviceSessions');
    const [backupHistory, setBackupHistory] = useStickyState<BackupRecord[]>([], 'dms-backupHistory');
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [syncQueue, setSyncQueue] = useStickyState<SyncQueueItem[]>([], 'dms-syncQueue');
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
    const [autoApprovalEnabled, setAutoApprovalEnabled] = useStickyState<boolean>(true, 'dms-autoApproval');
    const [settings, setSettings] = useStickyState<Settings>(initialSettings, 'dms-settings');

    useEffect(() => {
        api.fetchRoles().then(fetchedRoles => setRoles(fetchedRoles as Role[]));
    }, []);

    const logAction = useCallback((action: ActionType, targetCollection?: string, targetId?: string, changes?: string, actor?: User) => {
        const actingUser = actor || user;
        if (!actingUser) return;
        const newLog: AuditLog = {
            _id: `log-${Date.now()}`,
            userId: actingUser._id,
            userRole: actingUser.role,
            action,
            targetCollection,
            targetId,
            changes,
            timestamp: new Date().toISOString()
        };
        setAuditLogs(prev => [newLog, ...prev]);
    }, [user, setAuditLogs]);

    const addUser = async (userData: Omit<User, '_id'>): Promise<User> => {
        let authId = null;
        if (userData.password) {
            // Use secondary client to create user without changing current session
            const { supabaseAdminAuth } = await import('../src/lib/supabase.ts');
            const { data, error } = await supabaseAdminAuth.auth.signUp({
                email: userData.email,
                password: userData.password,
            });
            if (error) {
                console.error("Failed to create auth user:", error);
                if (error.message.includes('Invalid API key')) {
                    throw new Error('Your Supabase API key is invalid. Please check your VITE_SUPABASE_ANON_KEY environment variable.');
                }
                throw error;
            }
            if (data.user) {
                authId = data.user.id;
            }
        }

        const userToSave = { ...userData, authId: authId || undefined } as any;
        const savedUser = await api.saveUser(userToSave);
        setUsers(prev => [...prev, savedUser]);
        logAction(ActionType.Create, 'Users', savedUser._id, `Created new user ${savedUser.name} with role ${savedUser.role}.`);
        return savedUser;
    };

    const updateUser = async (updatedUser: User) => {
        if (updatedUser.password) {
            // If they are updating their own password, we can use the primary client
            if (user && user._id === updatedUser._id) {
                const { supabase } = await import('../src/lib/supabase.ts');
                const { error } = await supabase.auth.updateUser({ password: updatedUser.password });
                if (error) {
                    console.error("Failed to update auth password:", error);
                    throw error;
                }
            } else {
                // We can't easily update other users' passwords from the client without admin privileges
                console.warn("Cannot update another user's password from the client.");
            }
        }
        const savedUser = await api.saveUser(updatedUser);
        setUsers(prev => prev.map(u => u._id === savedUser._id ? savedUser : u));
        logAction(ActionType.Update, 'Users', savedUser._id, `Updated profile for ${savedUser.name}.`);
    };

    const deleteUser = async (userId: string) => {
        const userToDelete = users.find(u => u._id === userId);
        if (!userToDelete) return;
        await api.deleteUser(userId);
        setUsers(prev => prev.filter(u => u._id !== userId));
        logAction(ActionType.Delete, 'Users', userId, `Deleted user ${userToDelete.name}.`);
    };

     const addRole = async (roleData: Omit<Role, '_id'>): Promise<Role> => {
        const savedRole = await api.saveRole(roleData as Role);
        setRoles(prev => [...prev, savedRole]);
        logAction(ActionType.Create, 'Roles', savedRole._id, `Created new role '${savedRole.name}' with ${savedRole.permissions.length} permissions.`);
        return savedRole;
    };

    const updateRole = async (updatedRole: Role) => {
        const savedRole = await api.saveRole(updatedRole);
        const originalRole = roles.find(r => r._id === savedRole._id);
        let changesDescription = `Updated role '${savedRole.name}'.`;

        if (originalRole) {
            const changes = [];
            if (originalRole.name !== savedRole.name) {
                changes.push(`Name changed from '${originalRole.name}' to '${savedRole.name}'.`);
            }

            const originalPerms = new Set(originalRole.permissions);
            const updatedPerms = new Set(savedRole.permissions);
            const added = [...updatedPerms].filter(p => !originalPerms.has(p));
            const removed = [...originalPerms].filter(p => !updatedPerms.has(p));

            if (added.length > 0) {
                changes.push(`Added permissions: ${added.join(', ')}.`);
            }
            if (removed.length > 0) {
                changes.push(`Removed permissions: ${removed.join(', ')}.`);
            }
            
            if (changes.length > 0) {
                changesDescription = changes.join(' ');
            }
        }

        setRoles(prev => prev.map(r => r._id === savedRole._id ? savedRole : r));
        logAction(ActionType.Update, 'Roles', savedRole._id, changesDescription);
    };

    const deleteRole = async (roleId: string) => {
        const roleToDelete = roles.find(r => r._id === roleId);
        if (!roleToDelete) return;
        await api.deleteRole(roleId);
        setRoles(prev => prev.filter(r => r._id !== roleId));
        logAction(ActionType.Delete, 'Roles', roleId, `Deleted role '${roleToDelete.name}' which had ${roleToDelete.permissions.length} permissions.`);
    };

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({...prev, ...newSettings}));
        logAction(ActionType.Update, 'Settings', undefined, `Updated system settings.`);
    };

    useEffect(() => {
        if (!isOnline) {
            setSyncStatus('offline');
        } else if (syncQueue.length > 0) {
            setSyncStatus('pending');
        } else {
            setSyncStatus('synced');
        }
    }, [isOnline, syncQueue.length]);
    
    const addToQueue = (item: SyncQueueItem) => {
        setSyncQueue(prev => [...prev, item]);
    };
    
    const markNotificationAsRead = (notificationId: string) => {
        setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n));
    };
    
    const toggleAutoApproval = () => {
        const newValue = !autoApprovalEnabled;
        setAutoApprovalEnabled(newValue);
        logAction(ActionType.Update, 'Settings', undefined, `Auto-approval ${newValue ? 'enabled' : 'disabled'}.`);
    };
    
    const processQueue = async (dataActions: any) => {
        if (syncQueue.length === 0) return;
        setSyncStatus('syncing');
        await new Promise(resolve => setTimeout(resolve, 1500));
        syncQueue.forEach(item => {
            switch (item.type) {
                case 'ADD_BOOKING': dataActions.addBooking(item.payload); break;
                case 'UPDATE_BOOKING': dataActions.updateBooking(item.payload); break;
                case 'ADD_PAYMENT': dataActions.addPayment(item.payload.bookingId, item.payload.payment); break;
                case 'ADD_STOCK_ORDER': dataActions.createStockOrder(item.payload); break;
            }
        });
        setSyncQueue([]);
        setSyncStatus('synced');
    };
    
    const backupState = (dataState: any) => {
        const state = { ...dataState, users, roles, auditLogs, notifications, autoApprovalEnabled, settings };
        const timestamp = new Date().toISOString();
        const fileName = `dms-backup-${timestamp.split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        const newBackupRecord: BackupRecord = {
            _id: `backup-${Date.now()}`,
            timestamp,
            fileName,
        };
        setBackupHistory(prev => [newBackupRecord, ...prev].slice(0, 10)); // Keep last 10
    };

    const restoreState = (newState: any, dataActions: any) => {
        dataActions.restoreDataState(newState);
        if (user?.role !== 'Dealer') {
            if (newState.users) setUsers(newState.users);
            if (newState.roles) setRoles(newState.roles);
            if (newState.auditLogs) setAuditLogs(newState.auditLogs);
            if (newState.notifications) setNotifications(newState.notifications);
            if (typeof newState.autoApprovalEnabled === 'boolean') setAutoApprovalEnabled(newState.autoApprovalEnabled);
            if (newState.settings) updateSettings(newState.settings);
        }
    };

    const removeDeviceSession = (sessionId: string) => {
        setDeviceSessions(prev => prev.filter(s => s._id !== sessionId));
        logAction(ActionType.Update, 'DeviceSessions', sessionId, `User logged out remote device session.`);
    };

    const value: AppContextType = {
        users, roles, auditLogs, notifications, setNotifications, deviceSessions, backupHistory,
        settings, isOnline, syncStatus, syncQueue, autoApprovalEnabled,
        markNotificationAsRead, removeDeviceSession,
        setIsOnline, processQueue, addToQueue, toggleAutoApproval,
        backupState, restoreState, updateSettings, logAction, addUser, updateUser, deleteUser,
        addRole, updateRole, deleteRole,
    };
    
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};