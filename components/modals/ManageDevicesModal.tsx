import React from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';

interface ManageDevicesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ManageDevicesModal: React.FC<ManageDevicesModalProps> = ({ isOpen, onClose }) => {
    const { deviceSessions, removeDeviceSession } = useAppContext();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">Manage Active Devices</h3>
                    <p className="text-sm text-gray-500">You can see and log out of devices where your account is active.</p>
                </div>
                <div className="p-6">
                    <ul className="divide-y divide-gray-200">
                        {deviceSessions.map(session => (
                            <li key={session._id} className="py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-800">{session.os}</p>
                                    <p className="text-sm text-gray-500">{session.userAgent} - IP: {session.ip}</p>
                                    <p className={`text-xs mt-1 ${session.isCurrent ? 'text-green-600' : 'text-gray-400'}`}>
                                        {session.isCurrent ? 'Current session' : `Last active: ${new Date(session.lastActive).toLocaleDateString()}`}
                                    </p>
                                </div>
                                {!session.isCurrent && (
                                    <button
                                        onClick={() => removeDeviceSession(session._id)}
                                        className="text-sm text-red-600 hover:underline"
                                    >
                                        Log out
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="px-6 py-4 bg-gray-50 text-right">
                    <button onClick={onClose} className="py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManageDevicesModal;
