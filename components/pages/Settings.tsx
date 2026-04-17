import React, { useState, useRef, Suspense } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { DownloadIcon, UploadCloudIcon, ShareIcon, PlusIcon } from '../icons/Icons.tsx';
import ConfirmModal from '../modals/ConfirmModal.tsx';
import ManageDevicesModal from '../modals/ManageDevicesModal.tsx';
import { Settings as SettingsType } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import SkeletonLoader from '../shared/SkeletonLoader.tsx';

const Users = React.lazy(() => import('./Users.tsx'));
const RoleManagement = React.lazy(() => import('./RoleManagement.tsx'));

type SettingsTab = 'general' | 'security' | 'notifications' | 'data' | 'users' | 'roles';

const Settings: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
  const { 
      settings, updateSettings, autoApprovalEnabled, toggleAutoApproval,
      backupState, restoreState, backupHistory
  } = useAppContext();
  const dataContext = useData();
  const { canManageRoles, canViewUsersPage } = usePermissions();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [pendingState, setPendingState] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDevicesOpen, setDevicesOpen] = useState(false);

  const handleBackup = () => {
      const { dealers, products, stock, stockOrders, bookings } = dataContext;
      backupState({ dealers, products, stock, stockOrders, bookings });
      showToast("Backup created and download started!", "success");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const json = JSON.parse(e.target?.result as string);
                  setPendingState(json);
                  setConfirmOpen(true);
              } catch (error) {
                  showToast("Invalid backup file. Must be a valid JSON.", "error");
              }
          };
          reader.readAsText(file);
      }
  };
  
  const handleRestoreConfirm = () => {
      if (pendingState) {
          restoreState(pendingState, dataContext);
          showToast("System has been restored from backup.", "success");
      }
      setConfirmOpen(false);
      setPendingState(null);
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    updateSettings({ theme });
  };

  const handleNotificationChange = (key: keyof SettingsType['notifications']) => {
    updateSettings({ 
        notifications: {
            ...settings.notifications,
            [key]: !settings.notifications[key],
        }
    });
  };

  const renderContent = () => {
    switch (activeTab) {
        case 'general':
            return (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Allocation Settings</h3>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">Enable Auto-Approval</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">When enabled, requests from elite dealers (reputation score &gt;= 9) with sufficient stock will be automatically approved.</p>
                            </div>
                            <ToggleSwitch checked={autoApprovalEnabled} onChange={toggleAutoApproval} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Financial Settings</h3>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">Default Tax Rate (%)</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">Set the default tax rate applied to products and orders.</p>
                            </div>
                            <div className="w-32">
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    step="0.1"
                                    value={settings.taxRate || 0} 
                                    onChange={(e) => updateSettings({ taxRate: parseFloat(e.target.value) || 0 })}
                                    className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 focus:ring-primary focus:border-primary dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Appearance</h3>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                             <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">Theme</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">Choose between a light or dark theme for the dashboard.</p>
                            </div>
                            <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <button onClick={() => handleThemeChange('light')} className={`px-4 py-1.5 text-sm font-semibold rounded-md ${settings.theme === 'light' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}>Light</button>
                                <button onClick={() => handleThemeChange('dark')} className={`px-4 py-1.5 text-sm font-semibold rounded-md ${settings.theme === 'dark' ? 'bg-slate-800 shadow-sm text-white' : 'text-slate-500'}`}>Dark</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">App Installation Guide</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2"><DownloadIcon className="w-4 h-4"/> Android / Desktop (Chrome/Edge)</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Look for the "Install App" button in the top header bar, or click the install icon in your browser's address bar. This will install the DMS as a native application.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2"><ShareIcon className="w-4 h-4"/> iOS (iPhone/iPad)</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Open this site in Safari. Tap the <strong>Share</strong> button, then scroll down and tap <strong>"Add to Home Screen" <PlusIcon className="inline w-3 h-3"/></strong>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'security':
            return (
                 <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Session Management</h3>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">Active Devices</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">View and log out of devices where your account is active.</p>
                            </div>
                            <button onClick={() => setDevicesOpen(true)} className="py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                Manage Devices
                            </button>
                        </div>
                    </div>
                 </div>
            );
        case 'notifications':
            const notifOptions: { key: keyof SettingsType['notifications'], label: string, description: string }[] = [
                { key: 'newOrder', label: 'New Stock Order', description: 'Get an in-app notification when a dealer places a new stock order.' },
                { key: 'orderApproved', label: 'Order Approved', description: 'Notify me when an order is successfully approved and allocated.' },
                { key: 'orderRejected', label: 'Order Rejected', description: 'Notify me when a stock order is rejected.' },
                { key: 'lowStockWarning', label: 'Low Stock Warning', description: 'Get a notification when central stock for a product is critically low.' },
            ];
            return (
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">In-App Notifications</h3>
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {notifOptions.map(opt => (
                            <div key={opt.key} className="flex items-center justify-between py-4">
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100">{opt.label}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">{opt.description}</p>
                                </div>
                                <ToggleSwitch checked={settings.notifications[opt.key]} onChange={() => handleNotificationChange(opt.key)} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'data':
            return (
                 <div className="space-y-6">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".json" />
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">System Backup & Restore</h3>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                                Create an encrypted backup of the entire system. Restoring will overwrite all current data.
                            </p>
                            <div className="flex-shrink-0 flex space-x-2">
                                <button onClick={handleBackup} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                                    <DownloadIcon />
                                    <span>Create System Backup</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 py-2 px-4 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <UploadCloudIcon />
                                    <span>Restore from File</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 p-6">Backup History</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Filename</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {backupHistory.length > 0 ? backupHistory.map(backup => (
                                        <tr key={backup._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{new Date(backup.timestamp).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-700 dark:text-slate-200">{backup.fileName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <button onClick={handleBackup} className="text-primary hover:underline font-semibold">Re-download</button>
                                            </td>
                                        </tr>
                                )) : (
                                        <tr>
                                            <td colSpan={3} className="text-center py-10 text-slate-500 dark:text-slate-400">No backup history found.</td>
                                        </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                 </div>
            );
        case 'users':
            return <Suspense fallback={<SkeletonLoader type="table"/>}><Users showToast={showToast} /></Suspense>;
        case 'roles':
            return <Suspense fallback={<SkeletonLoader type="table"/>}><RoleManagement showToast={showToast} /></Suspense>;
    }
  };

  const tabs: { id: SettingsTab; label: string; visible: boolean }[] = [
    { id: 'general', label: 'General', visible: true },
    { id: 'security', label: 'Security', visible: true },
    { id: 'notifications', label: 'Notifications', visible: true },
    { id: 'data', label: 'Data & Backups', visible: true },
    { id: 'users', label: 'Users', visible: canViewUsersPage },
    { id: 'roles', label: 'Roles & Permissions', visible: canManageRoles },
  ];

  return (
    <div className="space-y-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">System Settings</h2>
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
            {tabs.filter(t => t.visible).map(tab => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm font-semibold capitalize transition-colors shrink-0 ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-slate-200'}`}>
                    {tab.label}
                 </button>
            ))}
        </div>
        <div className="mt-6 animate-fade-in">
            {renderContent()}
        </div>
        <ConfirmModal
            isOpen={isConfirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleRestoreConfirm}
            title="Confirm Restore"
            message="Are you sure you want to restore the system from this backup file? All current data will be overwritten."
        />
        <ManageDevicesModal isOpen={isDevicesOpen} onClose={() => setDevicesOpen(false)} />
    </div>
  );
};

const ToggleSwitch: React.FC<{ checked: boolean, onChange: () => void, disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <div className={`relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in ${disabled ? 'opacity-50' : ''}`}>
        <input 
            type="checkbox" 
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
        />
        <label className="toggle-label block overflow-hidden h-6 rounded-full bg-slate-300 dark:bg-slate-600 cursor-pointer"></label>
        <style>{`
            .toggle-checkbox:checked { right: 0; border-color: #1E40AF; }
            .toggle-checkbox:checked + .toggle-label { background-color: #3B82F6; }
        `}</style>
    </div>
);

export default Settings;