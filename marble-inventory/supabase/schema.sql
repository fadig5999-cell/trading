-- Marble Inventory Management Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marble types table
CREATE TABLE IF NOT EXISTS marble_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  hebrew_name TEXT NOT NULL,
  category TEXT,
  color TEXT,
  thickness TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  location TEXT,
  image_url TEXT,
  cost_price DECIMAL(12, 2),
  selling_price DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales history table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marble_type_id UUID NOT NULL REFERENCES marble_types(id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL DEFAULT 1 CHECK (quantity_sold > 0),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_time TIME NOT NULL DEFAULT CURRENT_TIME,
  price DECIMAL(12, 2),
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  sold_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock transactions log
CREATE TABLE IF NOT EXISTS stock_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marble_type_id UUID NOT NULL REFERENCES marble_types(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'remove', 'sell', 'manual')),
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marble_types_name ON marble_types(name);
CREATE INDEX IF NOT EXISTS idx_marble_types_category ON marble_types(category);
CREATE INDEX IF NOT EXISTS idx_marble_types_color ON marble_types(color);
CREATE INDEX IF NOT EXISTS idx_marble_types_quantity ON marble_types(quantity);
CREATE INDEX IF NOT EXISTS idx_sales_marble_type ON sales(marble_type_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_marble ON stock_transactions(marble_type_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marble_types_updated_at ON marble_types;
CREATE TRIGGER marble_types_updated_at
  BEFORE UPDATE ON marble_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marble_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Marble types policies
CREATE POLICY "Authenticated users can view marble types" ON marble_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert marble types" ON marble_types
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admins can update marble types" ON marble_types
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "Admins can delete marble types" ON marble_types
  FOR DELETE TO authenticated USING (is_admin());

-- Sales policies
CREATE POLICY "Authenticated users can view sales" ON sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sales" ON sales
  FOR INSERT TO authenticated WITH CHECK (is_admin());

-- Stock transactions policies
CREATE POLICY "Authenticated users can view stock transactions" ON stock_transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert stock transactions" ON stock_transactions
  FOR INSERT TO authenticated WITH CHECK (is_admin());

-- Storage bucket for marble images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marble-images', 'marble-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view marble images" ON storage.objects
  FOR SELECT USING (bucket_id = 'marble-images');

CREATE POLICY "Admins can upload marble images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'marble-images' AND is_admin()
  );

CREATE POLICY "Admins can update marble images" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'marble-images' AND is_admin()
  );

CREATE POLICY "Admins can delete marble images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'marble-images' AND is_admin()
  );
