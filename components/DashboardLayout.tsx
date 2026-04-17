import React, { useState, useEffect, Suspense } from 'react';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';
import Toast, { ToastProps } from './shared/Toast.tsx';
import OfflineIndicator from './shared/OfflineIndicator.tsx';
import { Page } from '../types.ts';
import { useAppContext } from '../hooks/useAppContext.ts';
import SkeletonLoader from './shared/SkeletonLoader.tsx';

// Lazy load pages for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard.tsx'));
const Dealers = React.lazy(() => import('./pages/Dealers.tsx'));
const Products = React.lazy(() => import('./pages/Products.tsx'));
const Stock = React.lazy(() => import('./pages/Stock.tsx'));
const StockOrders = React.lazy(() => import('./pages/StockOrders.tsx'));
const Bookings = React.lazy(() => import('./pages/Bookings.tsx'));
const Reports = React.lazy(() => import('./pages/Reports.tsx'));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs.tsx'));
const Settings = React.lazy(() => import('./pages/Settings.tsx'));
const DealerDetail = React.lazy(() => import('./pages/DealerDetail.tsx'));
const Profile = React.lazy(() => import('./pages/Profile.tsx'));
const Approvals = React.lazy(() => import('./pages/Approvals.tsx'));
const Announcements = React.lazy(() => import('./pages/Announcements.tsx'));
const Messages = React.lazy(() => import('./pages/Messages.tsx'));
const Commission = React.lazy(() => import('./pages/Commission.tsx'));
const Finance = React.lazy(() => import('./pages/Finance.tsx'));
const Customers = React.lazy(() => import('./pages/Customers.tsx'));

// Eagerly load dashboard components as they are part of the main page
const AdminDashboard = React.lazy(() => import('./dashboards/AdminDashboard.tsx'));
const FinanceDashboard = React.lazy(() => import('./dashboards/FinanceDashboard.tsx'));

const DashboardLayout: React.FC = () => {
    const [activePage, setActivePage] = useState<Page>('Dashboard');
    const [pageState, setPageState] = useState<any>(null);
    const [toasts, setToasts] = useState<Omit<ToastProps, 'onDismiss'>[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { settings } = useAppContext();

    useEffect(() => {
        const root = document.documentElement;
        if (settings.theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [settings.theme]);

    const handleSetActivePage = (page: Page, state?: any) => {
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
            case 'Dashboard': return <Dashboard setActivePage={handleSetActivePage} />;
            case 'Dealers': return <Dealers showToast={showToast} setActivePage={handleSetActivePage} initialState={pageState} onInitialStateConsumed={() => setPageState(null)} />;
            case 'Profile': return <Profile showToast={showToast} />;
            case 'Products': return <Products showToast={showToast} />;
            case 'CompanyStock': return <Stock stockView="central" showToast={showToast} initialState={pageState} onInitialStateConsumed={() => setPageState(null)} />;
            case 'DealerStock': return <Stock stockView="dealer" showToast={showToast} initialState={pageState} onInitialStateConsumed={() => setPageState(null)} />;
            case 'Bookings': return <Bookings showToast={showToast} />;
            case 'Approvals': return <Approvals showToast={showToast} />;
            case 'Stock Orders': return <StockOrders showToast={showToast} />;
            case 'Announcements': return <Announcements showToast={showToast} />;
            case 'Messages': return <Messages showToast={showToast} initialState={pageState} onInitialStateConsumed={() => setPageState(null)} />;
            case 'Reports': return <Reports showToast={showToast} />;
            case 'Finance': return <Finance showToast={showToast} />;
            case 'Customers': return <Customers showToast={showToast} />;
            case 'Commission': return <Commission />;
            case 'Audit Logs': return <AuditLogs />;
            case 'Settings': return <Settings showToast={showToast} />;
            case 'DealerDetail': return <DealerDetail dealerId={pageState?.dealerId} setActivePage={handleSetActivePage} showToast={showToast} />;
            default: return <Dashboard setActivePage={handleSetActivePage} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 font-sans">
            <Sidebar 
                activePage={activePage} 
                setActivePage={handleSetActivePage} 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    showToast={showToast} 
                    setActivePage={handleSetActivePage} 
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 dark:bg-slate-900 p-6">
                    <div className="container mx-auto">
                        <Suspense fallback={<SkeletonLoader type="table" rows={8} />}>
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
            <OfflineIndicator />
        </div>
    );
};

export default DashboardLayout;