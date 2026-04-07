import { useAuth } from './useAuth.ts';
import { User } from '../types.ts';
import { useAppContext } from './useAppContext.ts';
import { useMemo } from 'react';

export const usePermissions = () => {
    const { user } = useAuth();
    const { roles } = useAppContext();

    const permissions = useMemo(() => {
        const defaultPermissions = {
            // Product Management
            canCreateProduct: false,
            canUpdateProduct: false,
            canUpdateProductCore: false,
            canManageVariants: false,
            // Dealer Management
            canCreateDealer: false,
            canUpdateDealer: false,
            canApproveDealer: false,
            canRecalculateReputation: false,
            // Booking Management
            canCreateBooking: false,
            canUpdateBooking: false,
            canViewBookingActions: false,
            canViewInvoice: false,
            // User & Role Management
            canCreateUser: false,
            canUpdateUser: (_targetUser?: User) => false,
            canDeleteUser: (_targetUser?: User) => false,
            canViewUserActions: false,
            canManageRoles: false,
            canUpdateUserProfile: false,
            canUpdateUserRole: false,
            // Order Management
            canApproveStockOrder: false,
            canDispatchOrders: false,
            // Communication
            canManageAnnouncements: false,
            // Dealer-specific permissions
            canManageOwnBookings: false,
            canCreateOwnStockOrder: false,
            canConfirmReceipt: false,
            // Page Visibility
            canViewDealersPage: false,
            canViewProductsPage: false,
            canViewStockPage: false,
            canViewBookingsPage: false,
            canViewStockOrdersPage: false,
            canViewReportsPage: false,
            canViewAuditLogsPage: false,
            canViewUsersPage: false,
            canViewCommissionPage: false,
            canViewFinancePage: false,
        };

        if (!user || !roles.length) {
            return defaultPermissions;
        }

        const userRole = roles.find(r => r.name === user.role);
        if (!userRole) {
            return defaultPermissions;
        }

        const has = (permission: string) => userRole.permissions.includes(permission as any);
        
        const canUpdateBooking = has('booking:update');
        const canViewInvoice = has('booking:view_invoice');
        const canApproveOrder = has('order:approve');
        const canDispatchOrder = has('order:dispatch');
        const canCreateProduct = has('product:create');
        const canUpdateProductCore = has('product:update_core');
        const canManageVariants = has('product:manage_variants');
        const canUpdateProduct = canUpdateProductCore || canManageVariants;
        const canCreateDealer = has('dealer:create');
        const canUpdateDealer = has('dealer:update');
        const canApproveDealer = has('dealer:approve');
        const canManageRoles = has('system:manage_settings');
        const canUpdateUserProfile = has('user:update_profile');
        const canUpdateUserRole = has('user:update_role');

        return {
            // Action Permissions
            canCreateProduct,
            canUpdateProduct,
            canUpdateProductCore,
            canManageVariants,
            canCreateDealer,
            canUpdateDealer,
            canApproveDealer,
            canRecalculateReputation: has('dealer:recalculate_reputation'),
            canCreateBooking: has('booking:create'),
            canUpdateBooking,
            canViewInvoice,
            canViewBookingActions: canUpdateBooking || canViewInvoice,
            canCreateUser: has('user:create'),
            canUpdateUser: (targetUser: User) => {
                if (!canUpdateUserProfile && !canUpdateUserRole) return false;
                const targetRole = roles.find(r => r.name === targetUser.role);
                if (targetRole?.name === 'Super Admin' && user.role !== 'Super Admin') {
                    return false;
                }
                return true;
            },
            canDeleteUser: (targetUser: User) => {
                if (!has('user:delete')) return false;
                if (targetUser._id === user._id) return false; // Cannot delete self
                const targetRole = roles.find(r => r.name === targetUser.role);
                if (targetRole?.name === 'Super Admin' && user.role !== 'Super Admin') {
                    return false;
                }
                return true;
            },
            canViewUserActions: canUpdateUserProfile || canUpdateUserRole || has('user:delete'),
            canManageRoles,
            canUpdateUserProfile,
            canUpdateUserRole,
            canApproveStockOrder: canApproveOrder,
            canDispatchOrders: canDispatchOrder,
            canManageAnnouncements: has('system:manage_announcements'),
            canManageOwnBookings: has('dealer_self:manage_bookings'),
            canCreateOwnStockOrder: has('dealer_self:create_order'),
            canConfirmReceipt: has('dealer_self:confirm_receipt'),
            
            // Page Visibility Permissions
            canViewDealersPage: canCreateDealer || canUpdateDealer || canApproveDealer,
            canViewProductsPage: canCreateProduct || canUpdateProduct,
            canViewStockPage: canApproveOrder || canDispatchOrder,
            canViewBookingsPage: has('booking:create') || canUpdateBooking || canViewInvoice,
            canViewStockOrdersPage: canApproveOrder || canDispatchOrder,
            canViewReportsPage: has('system:view_reports'),
            canViewAuditLogsPage: has('system:view_audit_logs'),
            canViewUsersPage: has('user:view') || canManageRoles,
            canViewCommissionPage: has('system:view_commission_reports'),
            canViewFinancePage: has('system:view_finance_ledger'),
        };
    }, [user, roles]);

    return permissions;
};
