import React from 'react';

// Defines all granular permissions available in the system.
export const PERMISSIONS = {
  // Product Management
  'product:create': 'Create Products',
  'product:update_core': 'Update Core Product Details (Brand, Model, Specs)',
  'product:manage_variants': 'Manage Product Variants (Add, Edit, Remove)',

  // Dealer Management
  'dealer:create': 'Create Dealers',
  'dealer:update': 'Update Dealers',
  'dealer:approve': 'Approve Dealer Registrations',
  'dealer:recalculate_reputation': 'Recalculate Dealer Reputation Score',

  // Booking Management (Global)
  'booking:create': 'Create Bookings (Global)',
  'booking:update': 'Update Bookings (Global)',
  'booking:view_invoice': 'View Invoices (Global)',

  // User & Role Management
  'user:create': 'Create Users',
  'user:view': 'View Users List',
  'user:update_profile': 'Update User Profiles (Name, Contact)',
  'user:update_role': 'Change a User\'s Role',
  'user:delete': 'Delete Users',

  // Order Management
  'order:approve': 'Approve Stock Orders',
  'order:dispatch': 'Dispatch Stock Orders',

  // Dealer-specific permissions (for context, not assignable to non-dealers)
  'dealer_self:manage_bookings': 'Manage Own Bookings',
  'dealer_self:create_order': 'Create Own Stock Orders',
  'dealer_self:confirm_receipt': 'Confirm Receipt of Stock Orders',
  
  // System & Reporting
  'system:view_reports': 'View System Reports',
  'system:view_audit_logs': 'View Audit Logs',
  'system:manage_settings': 'Manage System Settings & Roles',
  'system:manage_announcements': 'Create and send system-wide announcements',
  'system:view_commission_reports': 'View Dealer Commission Reports',
  'system:view_finance_ledger': 'View Central Finance Ledger',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];
