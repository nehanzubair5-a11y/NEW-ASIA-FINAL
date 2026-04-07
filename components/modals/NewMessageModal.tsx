import React, { useState, useMemo } from 'react';
import { User } from '../../types.ts';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface NewMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRecipient: (user: User) => void;
}

const Avatar: React.FC<{ user: User }> = ({ user }) => {
    const initial = user.name.charAt(0).toUpperCase();
    const colorIndex = (user._id.charCodeAt(2) || 0) % 5;
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    return (
        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ${colors[colorIndex]}`}>
            {initial}
        </div>
    );
};


const NewMessageModal: React.FC<NewMessageModalProps> = ({ isOpen, onClose, onSelectRecipient }) => {
    const { user: currentUser } = useAuth();
    const { users } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');

    const potentialRecipients = useMemo(() => {
        const otherUsers = users.filter(u => u._id !== currentUser?._id);
        if (!searchQuery) {
            return otherUsers;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return otherUsers.filter(u => u.name.toLowerCase().includes(lowercasedQuery) || u.email.toLowerCase().includes(lowercasedQuery));
    }, [users, currentUser, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-slate-700">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-slate-100">New Message</h3>
                    <div className="relative mt-4">
                        <input
                            type="text"
                            placeholder="Search for a user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-2 pl-8 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm bg-white dark:bg-slate-700"
                            autoFocus
                        />
                         <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                        </div>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {potentialRecipients.map(user => (
                            <li key={user._id}>
                                <button onClick={() => onSelectRecipient(user)} className="w-full text-left p-4 flex items-center space-x-4 hover:bg-slate-100 dark:hover:bg-slate-700/50">
                                    <Avatar user={user} />
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{user.role}</p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 text-right border-t dark:border-slate-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
export default NewMessageModal;
