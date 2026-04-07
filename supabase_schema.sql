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
  resetTokenExpiry TIMESTAMP WITH TIME ZONE
);

-- Ensure password column exists if the table was created previously
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

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

-- Enable Row Level Security (RLS) for all tables to fix Security Advisor warnings
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

-- Create permissive policies for prototype (WARNING: In a real production app, restrict these!)
-- This allows the anon key to perform all operations, which is needed for the current prototype setup.
DROP POLICY IF EXISTS "Allow all operations for anon on roles" ON roles;
CREATE POLICY "Allow all operations for anon on roles" ON roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on users" ON users;
CREATE POLICY "Allow all operations for anon on users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on dealers" ON dealers;
CREATE POLICY "Allow all operations for anon on dealers" ON dealers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on products" ON products;
CREATE POLICY "Allow all operations for anon on products" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on stock" ON stock;
CREATE POLICY "Allow all operations for anon on stock" ON stock FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on stock_orders" ON stock_orders;
CREATE POLICY "Allow all operations for anon on stock_orders" ON stock_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on bookings" ON bookings;
CREATE POLICY "Allow all operations for anon on bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on dealer_payments" ON dealer_payments;
CREATE POLICY "Allow all operations for anon on dealer_payments" ON dealer_payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on announcements" ON announcements;
CREATE POLICY "Allow all operations for anon on announcements" ON announcements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on announcement_recipients" ON announcement_recipients;
CREATE POLICY "Allow all operations for anon on announcement_recipients" ON announcement_recipients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on conversations" ON conversations;
CREATE POLICY "Allow all operations for anon on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for anon on messages" ON messages;
CREATE POLICY "Allow all operations for anon on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
