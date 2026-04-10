-- Run this script in your Supabase SQL Editor to create the necessary tables
-- This script is idempotent, meaning you can run it multiple times safely.

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  _id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  isEditable BOOLEAN DEFAULT true
);

-- 2. Users Table (Links to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  _id TEXT PRIMARY KEY, -- In a real app, this should match auth.users(id) UUID
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT NOT NULL,
  dealerId TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  resetToken TEXT,
  resetTokenExpiry TIMESTAMP WITH TIME ZONE,
  avatarUrl TEXT
);

-- Ensure password and avatarUrl columns exist if the table was created previously
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatarUrl TEXT;

-- 3. Dealers Table
CREATE TABLE IF NOT EXISTS dealers (
  _id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ownerName TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  registrationApproved BOOLEAN DEFAULT false,
  reputationScore NUMERIC DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS products (
  _id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  modelName TEXT NOT NULL,
  variants JSONB NOT NULL DEFAULT '[]',
  specifications JSONB,
  priceHistory JSONB DEFAULT '[]'
);

-- 5. Stock Table
CREATE TABLE IF NOT EXISTS stock (
  _id TEXT PRIMARY KEY,
  vin TEXT NOT NULL,
  variantId TEXT NOT NULL,
  dealerId TEXT,
  status TEXT NOT NULL,
  assignedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Stock Orders Table
CREATE TABLE IF NOT EXISTS stock_orders (
  _id TEXT PRIMARY KEY,
  dealerId TEXT NOT NULL,
  requestTimestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  approvedItems JSONB DEFAULT '[]',
  allocatedStockIds JSONB DEFAULT '[]',
  trackingNumber TEXT
);

-- 7. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  _id TEXT PRIMARY KEY,
  customerName TEXT NOT NULL,
  customerPhone TEXT NOT NULL,
  dealerId TEXT NOT NULL,
  variantId TEXT NOT NULL,
  stockItemId TEXT,
  bookingTimestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL,
  payments JSONB DEFAULT '[]'
);

-- 8. Dealer Payments Table
CREATE TABLE IF NOT EXISTS dealer_payments (
  _id TEXT PRIMARY KEY,
  dealerId TEXT NOT NULL,
  stockOrderId TEXT,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  reference TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  proofOfPayment TEXT
);

-- 9. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  _id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sentByUserId TEXT NOT NULL
);

-- 10. Announcement Recipients Table
CREATE TABLE IF NOT EXISTS announcement_recipients (
  _id TEXT PRIMARY KEY,
  announcementId TEXT NOT NULL,
  userId TEXT NOT NULL,
  isRead BOOLEAN DEFAULT false
);

-- 11. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  _id TEXT PRIMARY KEY,
  participantIds JSONB NOT NULL DEFAULT '[]',
  lastMessageTimestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  _id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  isRead BOOLEAN DEFAULT false
);

-- Enable Realtime for all tables (We use DO block to avoid errors if already added)
DO $$
BEGIN
  BEGIN alter publication supabase_realtime add table roles; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table users; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table dealers; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table products; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table stock; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table stock_orders; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table bookings; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table dealer_payments; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table announcements; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table announcement_recipients; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table conversations; EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN alter publication supabase_realtime add table messages; EXCEPTION WHEN duplicate_object THEN null; END;
END $$;

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Add auth_id to users table to link with Supabase Auth without breaking existing _id relations
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- Helper functions to get current user's role and dealerId
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_dealer_id()
RETURNS TEXT AS $$
  SELECT "dealerId" FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ==========================================
-- RLS POLICIES (Requires Supabase Auth)
-- ==========================================

-- 1. Roles
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON roles;
CREATE POLICY "Roles are viewable by everyone" ON roles FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Roles are insertable by Admins" ON roles;
CREATE POLICY "Roles are insertable by Admins" ON roles FOR INSERT WITH CHECK (get_user_role() IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Roles are updatable by Admins" ON roles;
CREATE POLICY "Roles are updatable by Admins" ON roles FOR UPDATE USING (get_user_role() IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Roles are deletable by Admins" ON roles;
CREATE POLICY "Roles are deletable by Admins" ON roles FOR DELETE USING (get_user_role() IN ('Super Admin', 'Admin'));

-- 2. Users
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth_id = auth.uid() OR get_user_role() IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Users can link their auth_id" ON users;
CREATE POLICY "Users can link their auth_id" ON users FOR UPDATE USING (auth_id IS NULL AND email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Users are insertable by Admins" ON users;
CREATE POLICY "Users are insertable by Admins" ON users FOR INSERT WITH CHECK (get_user_role() IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Users are deletable by Admins" ON users;
CREATE POLICY "Users are deletable by Admins" ON users FOR DELETE USING (get_user_role() IN ('Super Admin', 'Admin'));

-- 3. Dealers
DROP POLICY IF EXISTS "Dealers are viewable by everyone" ON dealers;
CREATE POLICY "Dealers are viewable by everyone" ON dealers FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Dealers can be created by anyone (registration)" ON dealers;
CREATE POLICY "Dealers can be created by anyone (registration)" ON dealers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Dealers can update their own record" ON dealers;
CREATE POLICY "Dealers can update their own record" ON dealers FOR UPDATE USING (get_user_dealer_id() = _id OR get_user_role() IN ('Super Admin', 'Admin'));

-- 4. Products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Products are modifiable by Admins" ON products;
CREATE POLICY "Products are modifiable by Admins" ON products FOR ALL USING (get_user_role() IN ('Super Admin', 'Admin'));

-- 5. Stock
DROP POLICY IF EXISTS "Stock is viewable by everyone" ON stock;
CREATE POLICY "Stock is viewable by everyone" ON stock FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Stock is modifiable by Admins" ON stock;
CREATE POLICY "Stock is modifiable by Admins" ON stock FOR ALL USING (get_user_role() IN ('Super Admin', 'Admin'));

-- 6. Stock Orders
DROP POLICY IF EXISTS "Dealers can view their own orders, Admins view all" ON stock_orders;
CREATE POLICY "Dealers can view their own orders, Admins view all" ON stock_orders FOR SELECT USING (get_user_dealer_id() = "dealerId" OR get_user_role() IN ('Super Admin', 'Admin', 'Finance / Auditor'));

DROP POLICY IF EXISTS "Dealers can insert their own orders" ON stock_orders;
CREATE POLICY "Dealers can insert their own orders" ON stock_orders FOR INSERT WITH CHECK (get_user_dealer_id() = "dealerId" OR get_user_role() IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Admins can update orders" ON stock_orders;
CREATE POLICY "Admins can update orders" ON stock_orders FOR UPDATE USING (get_user_role() IN ('Super Admin', 'Admin'));

-- 7. Bookings
DROP POLICY IF EXISTS "Dealers can view their own bookings, Admins view all" ON bookings;
CREATE POLICY "Dealers can view their own bookings, Admins view all" ON bookings FOR SELECT USING (get_user_dealer_id() = "dealerId" OR get_user_role() IN ('Super Admin', 'Admin', 'Finance / Auditor'));

DROP POLICY IF EXISTS "Dealers can insert their own bookings" ON bookings;
CREATE POLICY "Dealers can insert their own bookings" ON bookings FOR INSERT WITH CHECK (get_user_dealer_id() = "dealerId" OR get_user_role() IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Dealers can update their own bookings" ON bookings;
CREATE POLICY "Dealers can update their own bookings" ON bookings FOR UPDATE USING (get_user_dealer_id() = "dealerId" OR get_user_role() IN ('Super Admin', 'Admin'));

-- 8. Dealer Payments
DROP POLICY IF EXISTS "Dealers can view their own payments, Admins view all" ON dealer_payments;
CREATE POLICY "Dealers can view their own payments, Admins view all" ON dealer_payments FOR SELECT USING (get_user_dealer_id() = "dealerId" OR get_user_role() IN ('Super Admin', 'Admin', 'Finance / Auditor'));

DROP POLICY IF EXISTS "Dealers can insert their own payments" ON dealer_payments;
CREATE POLICY "Dealers can insert their own payments" ON dealer_payments FOR INSERT WITH CHECK (get_user_dealer_id() = "dealerId" OR get_user_role() IN ('Super Admin', 'Admin'));

-- 9. Announcements
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON announcements;
CREATE POLICY "Announcements are viewable by everyone" ON announcements FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Announcements are modifiable by Admins" ON announcements;
CREATE POLICY "Announcements are modifiable by Admins" ON announcements FOR ALL USING (get_user_role() IN ('Super Admin', 'Admin'));

-- 10. Announcement Recipients
DROP POLICY IF EXISTS "Users can view their own announcements" ON announcement_recipients;
CREATE POLICY "Users can view their own announcements" ON announcement_recipients FOR SELECT USING (
  "userId" IN (SELECT _id FROM public.users WHERE auth_id = auth.uid()) 
  OR get_user_role() IN ('Super Admin', 'Admin')
);

DROP POLICY IF EXISTS "Users can update their own announcements" ON announcement_recipients;
CREATE POLICY "Users can update their own announcements" ON announcement_recipients FOR UPDATE USING (
  "userId" IN (SELECT _id FROM public.users WHERE auth_id = auth.uid()) 
  OR get_user_role() IN ('Super Admin', 'Admin')
);

-- 11. Conversations & Messages
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND _id = ANY("participantIds"))
);

DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
CREATE POLICY "Users can insert conversations" ON conversations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND _id = ANY("participantIds"))
);

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c._id = messages."conversationId" 
    AND EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND _id = ANY(c."participantIds"))
  )
);

DROP POLICY IF EXISTS "Users can insert messages" ON messages;
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (
  "senderId" IN (SELECT _id FROM public.users WHERE auth_id = auth.uid())
);

-- 12. Audit Logs
DROP POLICY IF EXISTS "Audit logs viewable by Admins" ON audit_logs;
CREATE POLICY "Audit logs viewable by Admins" ON audit_logs FOR SELECT USING (get_user_role() IN ('Super Admin', 'Admin', 'Finance / Auditor'));

DROP POLICY IF EXISTS "Anyone can insert audit logs" ON audit_logs;
CREATE POLICY "Anyone can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
