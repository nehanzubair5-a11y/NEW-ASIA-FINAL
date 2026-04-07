import React, { useState, Suspense, useMemo } from 'react';
import Header from './Header.tsx';
import { DashboardIcon, BoxIcon, ShieldIcon, PackageIcon, CalendarIcon, MegaphoneIcon, MessageSquareIcon } from './icons/Icons.tsx';
import Toast, { ToastProps } from './shared/Toast.tsx';
import type { DealerPage } from '../types.ts';
import SkeletonLoader from './shared/SkeletonLoader.tsx';
import { useData } from '../hooks/useData.ts';
import { useAuth } from '../hooks/useAuth.ts';

// Lazy load dealer pages
const DealerDashboard = React.lazy(() => import('./pages/dealer/DealerDashboard.tsx'));
const MyStock = React.lazy(() => import('./pages/dealer/MyStock.tsx'));
const MyBookings = React.lazy(() => import('./pages/dealer/MyBookings.tsx'));
const MyBackups = React.lazy(() => import('./pages/dealer/MyBackups.tsx'));
const MyStockOrders = React.lazy(() => import('./pages/dealer/MyStockOrders.tsx'));
const Profile = React.lazy(() => import('./pages/Profile.tsx'));
const DealerAnnouncements = React.lazy(() => import('./pages/dealer/DealerAnnouncements.tsx'));
const Messages = React.lazy(() => import('./pages/Messages.tsx'));


const DealerNavItem: React.FC<{
  page: DealerPage;
  activePage: DealerPage;
  setActivePage: (page: DealerPage, state?: any) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  badgeCount?: number;
  onClick?: () => void;
}> = ({ page, activePage, setActivePage, icon, children, badgeCount, onClick }) => {
  const isActive = activePage === page;
  return (
    <li className="relative">
      <a
        href="#"
        onClick={(e) => { 
            e.preventDefault(); 
            setActivePage(page);
            if (onClick) onClick();
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


const DealerSidebar: React.FC<{ 
    activePage: DealerPage, 
    setActivePage: (page: DealerPage, state?: any) => void,
    isOpen?: boolean,
    onClose?: () => void
}> = ({ activePage, setActivePage, isOpen, onClose }) => {
    const { user } = useAuth();
    const { announcementRecipients, conversations, messages } = useData();

    const unreadAnnouncements = useMemo(() => {
        if (!user) return 0;
        return announcementRecipients.filter(r => r.userId === user._id && !r.isRead).length;
    }, [announcementRecipients, user]);

    const unreadMessages = useMemo(() => {
        if (!user) return 0;
        const myConvoIds = new Set(conversations.filter(c => c.participantIds.includes(user._id)).map(c => c._id));
        return messages.filter(m => myConvoIds.has(m.conversationId) && m.senderId !== user._id && !m.isRead).length;
    }, [conversations, messages, user]);
    
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

            <aside className={`
                fixed inset-y-0 left-0 z-30 w-64 bg-primary text-white flex flex-col 
                transform transition-transform duration-300 ease-in-out
                md:static md:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="h-16 flex items-center justify-center border-b border-red-800 flex-shrink-0">
                    <h1 className="text-xl font-bold tracking-wider">Dealer Portal</h1>
                </div>
                <nav className="flex-1 px-4 py-6 overflow-y-auto">
                    <ul className="space-y-3">
                        <DealerNavItem page="Dashboard" activePage={activePage} setActivePage={setActivePage} icon={<DashboardIcon />} onClick={handleItemClick}>Dashboard</DealerNavItem>
                        <DealerNavItem page="Announcements" activePage={activePage} setActivePage={setActivePage} icon={<MegaphoneIcon />} badgeCount={unreadAnnouncements} onClick={handleItemClick}>Announcements</DealerNavItem>
                        <DealerNavItem page="Messages" activePage={activePage} setActivePage={setActivePage} icon={<MessageSquareIcon />} badgeCount={unreadMessages} onClick={handleItemClick}>Messages</DealerNavItem>
                        <DealerNavItem page="My Orders" activePage={activePage} setActivePage={setActivePage} icon={<PackageIcon />} onClick={handleItemClick}>My Orders</DealerNavItem>
                        <DealerNavItem page="My Stock" activePage={activePage} setActivePage={setActivePage} icon={<BoxIcon />} onClick={handleItemClick}>My Stock</DealerNavItem>
                        <DealerNavItem page="My Bookings" activePage={activePage} setActivePage={setActivePage} icon={<CalendarIcon />} onClick={handleItemClick}>My Bookings</DealerNavItem>
                        <DealerNavItem page="My Backups" activePage={activePage} setActivePage={setActivePage} icon={<ShieldIcon />} onClick={handleItemClick}>My Backups</DealerNavItem>
                    </ul>
                </nav>
                <div className="p-4 border-t border-red-800 mt-auto flex-shrink-0">
                    <p className="text-xs text-red-200 text-center mt-4">&copy; 2024 New Asia</p>
                </div>
            </aside>
        </>
    );
};


const DealerDashboardLayout: React.FC = () => {
  const [activePage, setActivePage] = useState<DealerPage>('Dashboard');
  const [pageState, setPageState] = useState<any>(null);
  const [toasts, setToasts] = useState<Omit<ToastProps, 'onDismiss'>[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSetActivePage = (page: DealerPage, state?: any) => {
    setActivePage(page);
    setPageState(state || null);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      const id = new Date().toISOString();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          dismissToast(id);
      }, 5000);
  };

  const dismissToast = (id: string) => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
  };


  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard': return <DealerDashboard setActivePage={handleSetActivePage} />;
      case 'Announcements': return <DealerAnnouncements />;
      case 'Messages': return <Messages showToast={showToast} initialState={pageState} onInitialStateConsumed={() => setPageState(null)} />;
      case 'My Orders': return <MyStockOrders showToast={showToast} />;
      case 'My Stock': return <MyStock />;
      case 'My Bookings': return <MyBookings showToast={showToast} />;
      case 'My Backups': return <MyBackups showToast={showToast}/>;
      case 'Profile': return <Profile showToast={showToast} />;
      default: return <DealerDashboard setActivePage={handleSetActivePage} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-200 dark:bg-slate-950 font-sans">
      <DealerSidebar 
        activePage={activePage} 
        setActivePage={handleSetActivePage} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
            showToast={showToast} 
            setActivePage={handleSetActivePage as (page: any, state?: any) => void}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-slate-100 dark:bg-slate-900">
          <div className="container mx-auto">
            <Suspense fallback={<SkeletonLoader type="table" rows={6} />}>
                {renderPage()}
            </Suspense>
          </div>
        </main>
      </div>
      <div className="fixed top-24 right-6 z-50 space-y-2">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
            ))}
      </div>
    </div>
  );
};

export default DealerDashboardLayout;