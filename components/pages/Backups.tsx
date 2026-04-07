import React, { useState, useRef } from 'react';
import { DownloadIcon, UploadCloudIcon } from '../icons/Icons.tsx';
import { useAppContext } from '../../hooks/useAppContext.ts';
import ConfirmModal from '../modals/ConfirmModal.tsx';
import { useData } from '../../hooks/useData.ts';

const Backups: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'info') => void; }> = ({ showToast }) => {
    const { backupState, restoreState, backupHistory } = useAppContext();
    const dataContext = useData();
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [pendingState, setPendingState] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    return (
        <div className="space-y-8">
             <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".json" />
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3">System Backup & Restore</h3>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <p className="text-sm text-gray-600 max-w-2xl">
                        Create an encrypted backup of the entire system (users, dealers, products, bookings). 
                        Restoring requires admin confirmation and will be staged first.
                    </p>
                    <div className="flex-shrink-0 flex space-x-2">
                        <button onClick={handleBackup} className="flex items-center space-x-2 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary">
                            <DownloadIcon />
                            <span>Create System Backup</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            <UploadCloudIcon />
                            <span>Restore from File</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 p-6">Backup History</h3>
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
                message="Are you sure you want to restore the system from this backup file? All current data will be overwritten."
            />
        </div>
    );
};

export default Backups;