import React, { useState, useRef, useMemo, useEffect } from 'react';
import { DownloadIcon, UploadCloudIcon } from '../../icons/Icons.tsx';
import ConfirmModal from '../../modals/ConfirmModal.tsx';
import { useAppContext } from '../../../hooks/useAppContext.ts';
import { useAuth } from '../../../hooks/useAuth.ts';
import { useData } from '../../../hooks/useData.ts';
import { BackupRecord } from '../../../types.ts';

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


const MyBackups: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { bookings, stock } = useData();
    const { restoreState } = useAppContext();
    const { user } = useAuth();
    
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [pendingState, setPendingState] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dataContext = useData();
    const [backupHistory, setBackupHistory] = useStickyState<BackupRecord[]>([], `dms-dealer-backups-${user?.dealerId}`);


    const dealerScopedState = useMemo(() => {
        const myBookings = bookings.filter(b => b.dealerId === user?.dealerId);
        const myStock = stock.filter(s => s.dealerId === user?.dealerId);
        return { bookings: myBookings, stock: myStock };
    }, [bookings, stock, user]);

    const handleBackup = () => {
        const timestamp = new Date().toISOString();
        const fileName = `dealer_${user?.dealerId}_backup_${timestamp.split('T')[0]}.json`;
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dealerScopedState, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = fileName;
        link.click();
        
        const newBackupRecord: BackupRecord = {
            _id: `backup-${Date.now()}`,
            timestamp,
            fileName,
        };
        setBackupHistory(prev => [newBackupRecord, ...prev].slice(0, 5)); // Keep last 5
        showToast("Dealer data backup created!", "success");
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    // Basic validation for dealer backup
                    if (json.bookings && json.stock) {
                        setPendingState(json);
                        setConfirmOpen(true);
                    } else {
                         showToast("Invalid backup file. Missing required data.", "error");
                    }
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
            showToast("Your data has been restored from backup.", "success");
        }
        setConfirmOpen(false);
        setPendingState(null);
    };

    return (
        <div className="space-y-8">
             <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".json" />
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3">My Data Backup & Restore</h3>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <p className="text-sm text-gray-600 max-w-2xl">
                        Create an encrypted backup of your dealer data (bookings, stock, etc.). You will need your password to restore it later.
                    </p>
                    <div className="flex-shrink-0 flex space-x-2">
                        <button onClick={handleBackup} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                            <DownloadIcon />
                            <span>Create My Backup</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            <UploadCloudIcon />
                            <span>Restore My Data</span>
                        </button>
                    </div>
                </div>
            </div>
             <div className="bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 p-6">My Backup History</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {backupHistory.length > 0 ? backupHistory.map(backup => (
                                <tr key={backup._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(backup.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{backup.fileName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button onClick={handleBackup} className="text-primary hover:underline font-semibold">Re-download</button>
                                    </td>
                                </tr>
                           )) : (
                                <tr>
                                    <td colSpan={3} className="text-center py-10 text-gray-500">No backup history found.</td>
                                </tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleRestoreConfirm}
                title="Confirm Restore"
                message="Are you sure you want to restore your data from this backup file? This will overwrite existing data."
            />
        </div>
    );
};

export default MyBackups;