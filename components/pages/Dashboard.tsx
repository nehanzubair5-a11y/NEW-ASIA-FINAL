import React from 'react';
import { useAuth } from '../../hooks/useAuth.ts';
// FIX: The 'Role' type was being used as a value (e.g., Role.Admin), but it's an interface.
// Replaced with string literals and removed the unused import.
import { Page } from '../../types.ts';
import AdminDashboard from '../dashboards/AdminDashboard.tsx';
import FinanceDashboard from '../dashboards/FinanceDashboard.tsx';
import SkeletonLoader from '../shared/SkeletonLoader.tsx';

const Dashboard: React.FC<{ setActivePage: (page: Page, state?: any) => void; }> = ({ setActivePage }) => {
    const { user } = useAuth();

    if (!user) return <SkeletonLoader type="cards" />;

    switch (user.role) {
        // FIX: Used string literal for role name.
        case 'Finance / Auditor':
            return <FinanceDashboard setActivePage={setActivePage} />;
        
        // FIX: Used string literals for role names.
        case 'Admin':
        case 'Super Admin':
        case 'Product Manager':
        case 'Booking Manager':
        case 'Stock Controller':
        case 'Logistics':
        default:
            return <AdminDashboard setActivePage={setActivePage} />;
    }
};

export default Dashboard;
