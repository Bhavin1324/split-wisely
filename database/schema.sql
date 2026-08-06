-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  default_currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. GROUPS
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cover_image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. GROUP MEMBERSHIPS
CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- 4. FRIENDS (Peer-to-peer relationships)
CREATE TABLE friends (
  user_id_1 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id_2 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id_1, user_id_2)
);

-- 5. EXPENSE CATEGORIES (Pro Spending Charts)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL
);

-- Insert Default Categories
INSERT INTO categories (name, icon_name) VALUES
  ('General', 'TagOutlined'),
  ('Food & Drink', 'CoffeeOutlined'),
  ('Transportation', 'CarOutlined'),
  ('Entertainment', 'SmileOutlined'),
  ('Utilities & Rent', 'HomeOutlined'),
  ('Shopping', 'ShoppingOutlined');

-- 6. EXPENSES (Free + Pro Unified)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- NULL for non-group 1-on-1 expense
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount INTEGER NOT NULL, -- Stored in base currency cents
  currency_code VARCHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(12, 6) DEFAULT 1.000000, -- Multiplier to convert to group base currency
  base_currency_amount INTEGER NOT NULL, -- total_amount * exchange_rate
  payer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT, -- Primary user who paid
  receipt_image_url TEXT, -- Pro: High-res receipt storage URL
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. EXPENSE SPLITS (Exact distribution owed per user)
CREATE TABLE expense_splits (
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount_owed INTEGER NOT NULL, -- Stored in base currency cents
  PRIMARY KEY (expense_id, user_id)
);

-- 8. RECEIPT ITEMS (Pro: Itemized OCR Splitting)
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  price INTEGER NOT NULL -- Stored in cents
);

-- 9. ITEM ASSIGNMENTS (Pro: Item-by-Item User Allocation)
CREATE TABLE item_assignments (
  item_id UUID REFERENCES receipt_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  share_multiplier DECIMAL(5, 2) DEFAULT 1.0, -- Handles split items (e.g. 0.5 share)
  PRIMARY KEY (item_id, user_id)
);

-- 10. SETTLEMENTS (Debt clearing payments)
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  payee_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL, -- Stored in cents
  currency_code VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. DEFAULT SPLITS (Pro: Pre-configured Group Split Rules)
CREATE TABLE default_splits (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  split_percentage DECIMAL(5, 2) NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- 12. EXPENSE COMMENTS
CREATE TABLE expense_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. ACTIVITY LOGS
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- e.g. 'ADDED_EXPENSE', 'SETTLED_UP', 'EDITED_EXPENSE'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RPC for Expense Creation
CREATE OR REPLACE FUNCTION create_expense_with_splits(
  p_group_id UUID,
  p_category_id UUID,
  p_description TEXT,
  p_total_amount INTEGER,
  p_currency_code VARCHAR,
  p_exchange_rate DECIMAL,
  p_payer_id UUID,
  p_receipt_image_url TEXT,
  p_created_by UUID,
  p_splits JSONB -- Array of { user_id: UUID, amount_owed: INT }
) RETURNS UUID AS $$
DECLARE
  v_expense_id UUID;
  v_split RECORD;
  v_base_amount INTEGER;
BEGIN
  v_base_amount := ROUND(p_total_amount * p_exchange_rate);
  
  INSERT INTO expenses (
    group_id, category_id, description, total_amount, 
    currency_code, exchange_rate, base_currency_amount, 
    payer_id, receipt_image_url, created_by
  ) VALUES (
    p_group_id, p_category_id, p_description, p_total_amount, 
    p_currency_code, p_exchange_rate, v_base_amount, 
    p_payer_id, p_receipt_image_url, p_created_by
  ) RETURNING id INTO v_expense_id;

  FOR v_split IN SELECT * FROM jsonb_to_recordset(p_splits) AS x(user_id UUID, amount_owed INT)
  LOOP
    INSERT INTO expense_splits (expense_id, user_id, amount_owed)
    VALUES (v_expense_id, v_split.user_id, v_split.amount_owed);
  END LOOP;

  INSERT INTO activity_logs (group_id, user_id, action_type, metadata)
  VALUES (p_group_id, p_created_by, 'ADDED_EXPENSE', jsonb_build_object('expense_id', v_expense_id, 'description', p_description));

  RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql;
