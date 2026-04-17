import React, { useMemo } from 'react';
import {
    DashboardIcon,
    UsersIcon,
    PackageIcon,
    BoxIcon,
    CalendarIcon,
    BarChart2Icon,
    BookOpenIcon,
    SettingsIcon,
    CheckSquareIcon,
    ClipboardListIcon,
    FileSearchIcon,
    MegaphoneIcon,
    MessageSquareIcon,
    DollarSignIcon,
    ArchiveIcon
} from './icons/Icons.tsx';
import { Page } from '../types.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useData } from '../hooks/useData.ts';

const NavItem: React.FC<{
    page: Page;
    activePage: Page;
    setActivePage: (page: Page, state?: any) => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    hidden?: boolean;
    badgeCount?: number;
    onClick?: () => void;
}> = ({ page, activePage, setActivePage, icon, children, hidden, badgeCount, onClick }) => {
    if (hidden) return null;
    const isActive = activePage === page;
    return (
        <li className="relative">
            <a 
                href="#" 
                onClick={(e) => { 
                    e.preventDefault(); 
                    setActivePage(page);
                    if(onClick) onClick();
                }} 
                className={`flex items-center p-2 rounded-lg transition-colors duration-200 ${isActive ? 'bg-secondary font-semibold text-white' : 'text-red-100 hover:bg-secondary/80'}`}
            >
                {icon}
                <span className="ml-3 flex-1">{children}</span>
                 {badgeCount && badgeCount > 0 && (
                    <span className="bg-white text-primary text-xs font-bold px-2 py-0.5 rounded-full">{badgeCount}</span>
                )}
            </a>
            {isActive && <div className="absolute left-0 top-0 h-full w-1 bg-white rounded-r-full"></div>}
        </li>
    );
};

const Sidebar: React.FC<{ 
    activePage: Page, 
    setActivePage: (page: Page, state?: any) => void,
    isOpen?: boolean,
    onClose?: () => void
}> = ({ activePage, setActivePage, isOpen, onClose }) => {
    const { user } = useAuth();
    const { messages, conversations } = useData();
    const permissions = usePermissions();

    const unreadMessagesCount = useMemo(() => {
        if (!user) return 0;
        const myConversations = conversations.filter(c => c.participantIds.includes(user._id));
        const myConversationIds = new Set(myConversations.map(c => c._id));
        return messages.filter(m => myConversationIds.has(m.conversationId) && m.senderId !== user._id && !m.isRead).length;
    }, [messages, conversations, user]);
    
    if (!user) return null;

    const handleItemClick = () => {
        if (onClose) onClose();
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden transition-opacity duration-300"
                    onClick={onClose}
                    aria-hidden="true"
                ></div>
            )}

            {/* Sidebar Content */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-64 bg-primary text-white flex flex-col no-print
                transform transition-transform duration-300 ease-in-out
                md:static md:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="h-16 flex items-center justify-center border-b border-red-800 flex-shrink-0">
                    <h1 className="text-2xl font-extrabold tracking-widest uppercase text-white">New Asia</h1>
                </div>
                <nav className="flex-1 px-4 py-6 overflow-y-auto">
                    <ul className="space-y-3">
                        <NavItem page="Dashboard" activePage={activePage} setActivePage={setActivePage} icon={<DashboardIcon />} onClick={handleItemClick}>Dashboard</NavItem>
                        <NavItem page="Dealers" activePage={activePage} setActivePage={setActivePage} icon={<UsersIcon />} hidden={!permissions.canViewDealersPage} onClick={handleItemClick}>Dealers</NavItem>
                        <NavItem page="Products" activePage={activePage} setActivePage={setActivePage} icon={<PackageIcon />} hidden={!permissions.canViewProductsPage} onClick={handleItemClick}>Products</NavItem>
                        <NavItem page="CompanyStock" activePage={activePage} setActivePage={setActivePage} icon={<ArchiveIcon />} hidden={!permissions.canViewStockPage} onClick={handleItemClick}>Company Stock</NavItem>
                        <NavItem page="DealerStock" activePage={activePage} setActivePage={setActivePage} icon={<UsersIcon />} hidden={!permissions.canViewStockPage} onClick={handleItemClick}>Dealer Stock</NavItem>
                        <NavItem page="Bookings" activePage={activePage} setActivePage={setActivePage} icon={<CalendarIcon />} hidden={!permissions.canViewBookingsPage} onClick={handleItemClick}>Bookings</NavItem>
                        <NavItem page="Customers" activePage={activePage} setActivePage={setActivePage} icon={<UsersIcon />} hidden={!permissions.canViewBookingsPage} onClick={handleItemClick}>Customers</NavItem>
                        <NavItem page="Approvals" activePage={activePage} setActivePage={setActivePage} icon={<CheckSquareIcon />} hidden={!permissions.canApproveStockOrder} onClick={handleItemClick}>Approvals</NavItem>
                        <NavItem page="Stock Orders" activePage={activePage} setActivePage={setActivePage} icon={<ClipboardListIcon />} hidden={!permissions.canViewStockOrdersPage} onClick={handleItemClick}>Stock Orders</NavItem>
                        <NavItem page="Announcements" activePage={activePage} setActivePage={setActivePage} icon={<MegaphoneIcon />} hidden={!permissions.canManageAnnouncements} onClick={handleItemClick}>Announcements</NavItem>
                        <NavItem page="Messages" activePage={activePage} setActivePage={setActivePage} icon={<MessageSquareIcon />} badgeCount={unreadMessagesCount} onClick={handleItemClick}>Messages</NavItem>
                        <NavItem page="Reports" activePage={activePage} setActivePage={setActivePage} icon={<BarChart2Icon />} hidden={!permissions.canViewReportsPage} onClick={handleItemClick}>Reports</NavItem>
                        <NavItem page="Finance" activePage={activePage} setActivePage={setActivePage} icon={<DollarSignIcon />} hidden={!permissions.canViewFinancePage} onClick={handleItemClick}>Finance</NavItem>
                        <NavItem page="Commission" activePage={activePage} setActivePage={setActivePage} icon={<DollarSignIcon />} hidden={!permissions.canViewCommissionPage} onClick={handleItemClick}>Commission</NavItem>
                        <NavItem page="Audit Logs" activePage={activePage} setActivePage={setActivePage} icon={<BookOpenIcon />} hidden={!permissions.canViewAuditLogsPage} onClick={handleItemClick}>Audit Logs</NavItem>
                        <NavItem page="Settings" activePage={activePage} setActivePage={setActivePage} icon={<SettingsIcon />} onClick={handleItemClick}>Settings</NavItem>
                    </ul>
                </nav>
                <div className="p-4 border-t border-red-800 mt-auto flex-shrink-0">
                    <div className="text-center">
                        <p className="font-semibold">{user?.name}</p>
                        <p className="text-sm text-red-200">{user?.role}</p>
                    </div>
                    <p className="text-xs text-red-200 text-center mt-4">&copy; 2024 New Asia</p>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;