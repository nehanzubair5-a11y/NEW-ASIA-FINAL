import React, { useState } from 'react';
import Spinner from '../shared/Spinner.tsx';

interface ScheduleReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({ isOpen, onClose, showToast }) => {
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            setIsSaving(false);
            showToast("Report scheduled successfully!", "success");
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-semibold text-gray-800">Schedule New Report</h3>
                        <p className="text-sm text-gray-500">Set up a recurring email report.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="reportName" className="block text-sm font-medium text-gray-700">Report Name</label>
                            <input type="text" id="reportName" required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2" defaultValue="Monthly Sales Summary" />
                        </div>
                         <div>
                            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">Frequency</label>
                            <select id="frequency" required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2">
                                <option>Daily</option>
                                <option>Weekly</option>
                                <option selected>Monthly</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="recipients" className="block text-sm font-medium text-gray-700">Recipients</label>
                            <input type="email" id="recipients" required multiple className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2" placeholder="comma, separated, emails" defaultValue="manager@system.com" />
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 text-right space-x-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSaving} className="w-28 flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary disabled:bg-slate-400">
                            {isSaving ? <Spinner /> : 'Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleReportModal;