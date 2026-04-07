import React, { useEffect } from 'react';
import { Announcement } from '../../types.ts';
import { useData } from '../../hooks/useData.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';

interface ViewAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    announcement: Announcement | null;
}

const ViewAnnouncementModal: React.FC<ViewAnnouncementModalProps> = ({ isOpen, onClose, announcement }) => {
    const { markAnnouncementAsRead } = useData();
    const { users } = useAppContext();

    useEffect(() => {
        if (isOpen && announcement) {
            markAnnouncementAsRead(announcement._id);
        }
    }, [isOpen, announcement, markAnnouncementAsRead]);

    if (!isOpen || !announcement) return null;

    const senderName = users.find(u => u._id === announcement.sentByUserId)?.name || 'Head Office';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">{announcement.subject}</h3>
                    <p className="text-sm text-gray-500">From: {senderName} on {new Date(announcement.timestamp).toLocaleString()}</p>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <p className="text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
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

export default ViewAnnouncementModal;
