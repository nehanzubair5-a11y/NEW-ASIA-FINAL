import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import {
    BellIcon,
    UserIcon,
    LogOutIcon,
    SlidersIcon,
    DownloadIcon,
    MenuIcon
} from './icons/Icons.tsx';
import NotificationsDropdown from './shared/NotificationsDropdown.tsx';
import ManageDevicesModal from './modals/ManageDevicesModal.tsx';
import SyncStatusIndicator from './shared/SyncStatusIndicator.tsx';
import Tooltip from './shared/Tooltip.tsx';
import { Page } from '../types.ts';

const Header: React.FC<{
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    setActivePage?: (page: Page, state?: any) => void;
    onToggleSidebar?: () => void;
}> = ({ showToast, setActivePage, onToggleSidebar }) => {
    const { user, logout } = useAuth();
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isNotificationsOpen, setNotificationsOpen] = useState(false);
    const [isDevicesOpen, setDevicesOpen] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        
        // Listen for the beforeinstallprompt event
        const handleInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleInstallPrompt);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                setDeferredPrompt(null);
            });
        }
    };

    return (
        <header className="h-16 flex-shrink-0 flex items-center justify-between md:justify-end px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10 no-print">
            {onToggleSidebar && (
                <button
                    onClick={onToggleSidebar}
                    className="md:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Open sidebar"
                >
                    <MenuIcon className="w-6 h-6" />
                </button>
            )}

            <div className="flex items-center space-x-4">
                {deferredPrompt && (
                    <Tooltip content="Install App">
                        <button 
                            onClick={handleInstallClick} 
                            className="flex items-center space-x-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 text-sm font-medium transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden md:inline">Install App</span>
                        </button>
                    </Tooltip>
                )}

                <SyncStatusIndicator showToast={showToast} />
                
                <div ref={notificationsRef} className="relative">
                    <Tooltip content="Notifications" position="bottom">
                        <button onClick={() => setNotificationsOpen(prev => !prev)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
                            <BellIcon />
                        </button>
                    </Tooltip>
                    {isNotificationsOpen && <NotificationsDropdown onClose={() => setNotificationsOpen(false)} setActivePage={setActivePage} />}
                </div>

                <div ref={menuRef} className="relative">
                    <Tooltip content="Profile & Settings" position="bottom">
                         <button onClick={() => setMenuOpen(prev => !prev)} className="flex items-center space-x-2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                {user?.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left hidden md:block">
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{user?.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
                            </div>
                        </button>
                    </Tooltip>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg z-20 border border-slate-200 dark:border-slate-700 animate-fade-in">
                            <ul className="py-1">
                                <li>
                                    <button onClick={() => { setActivePage?.('Profile'); setMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <UserIcon className="mr-3"/> Profile
                                    </button>
                                </li>
                                <li><button onClick={() => setDevicesOpen(true)} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><SlidersIcon className="mr-3"/> Manage Devices</button></li>
                                <li className="border-t border-slate-200 dark:border-slate-700 my-1"></li>
                                <li><button onClick={logout} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"><LogOutIcon className="mr-3"/> Logout</button></li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            <ManageDevicesModal isOpen={isDevicesOpen} onClose={() => setDevicesOpen(false)} />
        </header>
    );
};

export default Header;