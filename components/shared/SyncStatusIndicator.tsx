import React, { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { SyncIcon, CloudOffIcon, CheckCircleIcon, AlertTriangleIcon } from '../icons/Icons.tsx';
import Tooltip from './Tooltip.tsx';
import { useData } from '../../hooks/useData.ts';

const SyncStatusIndicator: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { syncStatus, syncQueue, processQueue, isOnline, setIsOnline } = useAppContext();
    const dataActions = useData();
    const [isOpen, setIsOpen] = useState(false);
    const pendingCount = syncQueue.length;

    const getStatusDetails = () => {
        switch (syncStatus) {
            case 'synced':
                return { text: 'Synced', Icon: CheckCircleIcon, color: 'text-green-600', tooltip: 'All data is synced with the server.' };
            case 'pending':
                return { text: 'Sync Pending', Icon: SyncIcon, color: 'text-yellow-600', tooltip: `${pendingCount} item(s) waiting to be synced.` };
            case 'syncing':
                return { text: 'Syncing...', Icon: () => <SyncIcon className="animate-spin" />, color: 'text-blue-600', tooltip: 'Syncing data with the server...' };
            case 'error':
                return { text: 'Sync Error', Icon: AlertTriangleIcon, color: 'text-red-600', tooltip: 'An error occurred during the last sync.' };
            case 'offline':
                return { text: 'Offline', Icon: CloudOffIcon, color: 'text-gray-500', tooltip: 'You are currently offline. Changes are saved locally.' };
            default:
                return { text: 'Unknown', Icon: AlertTriangleIcon, color: 'text-gray-500', tooltip: 'Unknown sync status.' };
        }
    };
    
    const handleSync = () => {
        processQueue(dataActions)
            .then(() => showToast("Sync complete!", "success"))
            .catch(() => showToast("Sync failed. Please try again.", "error"));
        setIsOpen(false);
    }
    
    const handleToggleOffline = () => {
      setIsOnline(!isOnline);
      showToast(isOnline ? "Simulating offline mode." : "You are back online.", "info");
    }

    const { text, Icon, color, tooltip } = getStatusDetails();

    return (
        <div className="relative">
            <Tooltip content={tooltip} position="bottom">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center space-x-2 text-sm font-medium p-2 rounded-md transition ${color} hover:bg-gray-100`}
                >
                    <Icon />
                    <span className="hidden md:inline">{text}</span>
                    {pendingCount > 0 && syncStatus !== 'syncing' && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs text-white">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </Tooltip>
            {isOpen && (
                 <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-20 border">
                     <div className="p-4 border-b">
                         <h4 className="font-semibold text-gray-800">Data Sync Status</h4>
                         <p className={`text-sm mt-1 ${color}`}>{text}</p>
                     </div>
                     <div className="p-4 space-y-4">
                         <div className="flex justify-between items-center">
                            <label htmlFor="offline-toggle" className="text-sm text-gray-700">Simulate Offline</label>
                            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                <input type="checkbox" name="offline-toggle" id="offline-toggle" checked={!isOnline} onChange={handleToggleOffline} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                                <label htmlFor="offline-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                            </div>
                         </div>
                         <button 
                             onClick={handleSync}
                             disabled={syncStatus === 'syncing' || pendingCount === 0}
                             className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-gray-400"
                         >
                            <SyncIcon className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                            <span>{syncStatus === 'error' ? 'Retry Sync' : 'Sync Now'} ({pendingCount})</span>
                         </button>
                     </div>
                 </div>
            )}
            <style>{`
                .toggle-checkbox:checked { right: 0; border-color: #1E40AF; }
                .toggle-checkbox:checked + .toggle-label { background-color: #3B82F6; }
            `}</style>
        </div>
    );
};

export default SyncStatusIndicator;
