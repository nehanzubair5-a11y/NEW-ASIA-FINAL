import React from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { Notification, Page } from '../../types.ts';

const NotificationsDropdown: React.FC<{ 
    onClose: () => void;
    setActivePage?: (page: Page, state?: any) => void;
}> = ({ onClose, setActivePage }) => {
    const { notifications, markNotificationAsRead } = useAppContext();

    const handleNotificationClick = (notification: Notification) => {
        markNotificationAsRead(notification._id);
        if (notification.link && setActivePage) {
            setActivePage(notification.link.page, notification.link.state);
        }
        onClose();
    };

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-20 border">
            <div className="p-3 border-b font-semibold text-gray-800">
                Notifications
            </div>
            <ul className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? notifications.map(notification => (
                    <li key={notification._id} className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`} onClick={() => handleNotificationClick(notification)}>
                        <p className="text-sm text-gray-700">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                    </li>
                )) : (
                    <li className="p-4 text-center text-gray-500">No new notifications.</li>
                )}
            </ul>
            <div className="p-2 text-center bg-gray-50">
                <button onClick={onClose} className="text-sm text-primary hover:underline">Close</button>
            </div>
        </div>
    );
};

export default NotificationsDropdown;
