-- =====================================================
-- Marble Showroom Inventory Management - Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MARBLE TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marble_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_hebrew VARCHAR(255),
  category VARCHAR(100),
  color VARCHAR(100),
  thickness VARCHAR(50),
  size VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  location VARCHAR(255),
  image_url TEXT,
  cost_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, low_stock, sold_out
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SALES HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marble_type_id UUID REFERENCES marble_types(id) ON DELETE SET NULL,
  marble_name VARCHAR(255) NOT NULL,
  marble_name_hebrew VARCHAR(255),
  quantity_sold INTEGER NOT NULL DEFAULT 1,
  selling_price DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  notes TEXT,
  sold_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STOCK MOVEMENTS TABLE (audit log)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marble_type_id UUID REFERENCES marble_types(id) ON DELETE SET NULL,
  marble_name VARCHAR(255) NOT NULL,
  movement_type VARCHAR(50) NOT NULL, -- add, remove, sell, manual_adjust
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FUNCTION: Auto-update status based on quantity
-- =====================================================
CREATE OR REPLACE FUNCTION update_marble_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= 0 THEN
    NEW.status := 'sold_out';
    NEW.quantity := 0;
  ELSIF NEW.quantity <= 3 THEN
    NEW.status := 'low_stock';
  ELSE
    NEW.status := 'in_stock';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Apply status update on quantity change
-- =====================================================
DROP TRIGGER IF EXISTS marble_status_trigger ON marble_types;
CREATE TRIGGER marble_status_trigger
  BEFORE INSERT OR UPDATE ON marble_types
  FOR EACH ROW
  EXECUTE FUNCTION update_marble_status();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE marble_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow authenticated read marble_types" ON marble_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read sales" ON sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read stock_movements" ON stock_movements
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated insert marble_types" ON marble_types
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update marble_types" ON marble_types
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete marble_types" ON marble_types
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert sales" ON sales
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated delete sales" ON sales
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert stock_movements" ON stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- STORAGE BUCKET for marble images
-- =====================================================
-- Run this in Supabase Storage dashboard or via API:
-- Create a bucket named 'marble-images' with public access

-- =====================================================
-- SAMPLE DATA
-- =====================================================
INSERT INTO marble_types (name, name_hebrew, category, color, thickness, size, quantity, location, cost_price, selling_price, notes) VALUES
('Carrara White', 'קררה לבן', 'שיש', 'לבן', '2 ס"מ', '300x150 ס"מ', 15, 'מחסן א - שורה 1', 800, 1500, 'שיש איטלקי פרמיום'),
('Nero Marquina', 'נרו מרקינה', 'שיש', 'שחור', '2 ס"מ', '280x140 ס"מ', 8, 'מחסן א - שורה 2', 1200, 2200, 'שיש ספרדי שחור עם ורידים לבנים'),
('Calacatta Gold', 'קלקאטה זהב', 'שיש', 'לבן-זהב', '3 ס"מ', '320x160 ס"מ', 2, 'תצוגה מרכזית', 2000, 3800, 'שיש יוקרתי במיוחד'),
('Emperador Dark', 'אמפרדור כהה', 'שיש', 'חום', '2 ס"מ', '290x145 ס"מ', 12, 'מחסן ב - שורה 1', 900, 1700, 'שיש ספרדי חום כהה'),
('Botticino', 'בוטיצ''ינו', 'שיש', 'בז׳', '2 ס"מ', '300x150 ס"מ', 5, 'מחסן ב - שורה 2', 700, 1300, 'שיש איטלקי בגוון בז׳'),
('Black Galaxy', 'גלקסי שחור', 'גרניט', 'שחור', '2 ס"מ', '280x140 ס"מ', 0, 'מחסן ג - שורה 1', 600, 1200, 'גרניט הודי שחור עם נקודות זהב'),
('Kashmir White', 'קשמיר לבן', 'גרניט', 'לבן', '2 ס"מ', '300x150 ס"מ', 3, 'מחסן ג - שורה 2', 650, 1250, 'גרניט הודי לבן'),
('Statuario', 'סטטואריו', 'שיש', 'לבן', '3 ס"מ', '320x160 ס"מ', 1, 'תצוגה VIP', 2500, 4500, 'שיש איטלקי נדיר');
