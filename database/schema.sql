-- ============================================================================
-- SplitWisely Master PostgreSQL DDL Schema & RPC Procedures
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  default_currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Automatic Profile Creation Trigger on Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, default_currency)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'User'),
    new.raw_user_meta_data->>'avatar_url',
    'USD'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. GROUPS
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cover_image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- 3. GROUP MEMBERSHIPS
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- 4. FRIENDS (Peer-to-peer relationships)
CREATE TABLE IF NOT EXISTS friends (
  user_id_1 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id_2 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id_1, user_id_2)
);
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- 5. EXPENSE CATEGORIES (Pro Spending Charts)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Insert Default Categories
INSERT INTO categories (name, icon_name) VALUES
  ('General', 'TagOutlined'),
  ('Food & Drink', 'CoffeeOutlined'),
  ('Transportation', 'CarOutlined'),
  ('Entertainment', 'SmileOutlined'),
  ('Utilities & Rent', 'HomeOutlined'),
  ('Shopping', 'ShoppingOutlined')
ON CONFLICT (name) DO NOTHING;

-- 6. EXPENSES (Free + Pro Unified)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  currency_code VARCHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(12, 6) DEFAULT 1.000000,
  base_currency_amount INTEGER NOT NULL,
  payer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  receipt_image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 7. EXPENSE SPLITS (Exact distribution owed per user)
CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount_owed INTEGER NOT NULL,
  PRIMARY KEY (expense_id, user_id)
);
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- 8. RECEIPT ITEMS (Pro: Itemized OCR Splitting)
CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  price INTEGER NOT NULL
);
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- 9. ITEM ASSIGNMENTS (Pro: Item-by-Item User Allocation)
CREATE TABLE IF NOT EXISTS item_assignments (
  item_id UUID REFERENCES receipt_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  share_multiplier DECIMAL(5, 2) DEFAULT 1.0,
  PRIMARY KEY (item_id, user_id)
);
ALTER TABLE item_assignments ENABLE ROW LEVEL SECURITY;

-- 10. SETTLEMENTS (Debt clearing payments)
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  payee_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL,
  currency_code VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- 11. DEFAULT SPLITS (Pro: Pre-configured Group Split Rules)
CREATE TABLE IF NOT EXISTS default_splits (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  split_percentage DECIMAL(5, 2) NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
ALTER TABLE default_splits ENABLE ROW LEVEL SECURITY;

-- 12. EXPENSE COMMENTS
CREATE TABLE IF NOT EXISTS expense_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE expense_comments ENABLE ROW LEVEL SECURITY;

-- 13. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Atomic Stored Procedure (RPC) for Expense Creation
-- ============================================================================
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
  p_splits JSONB
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Profiles
DROP POLICY IF EXISTS "Public profiles read" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Public profiles read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories
DROP POLICY IF EXISTS "Categories read" ON categories;
CREATE POLICY "Categories read" ON categories FOR SELECT USING (true);

-- Groups
DROP POLICY IF EXISTS "View user groups" ON groups;
DROP POLICY IF EXISTS "Create groups" ON groups;
CREATE POLICY "View user groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group Members
DROP POLICY IF EXISTS "View group members" ON group_members;
DROP POLICY IF EXISTS "Insert group members" ON group_members;
CREATE POLICY "View group members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Insert group members" ON group_members FOR INSERT WITH CHECK (true);

-- Friends
DROP POLICY IF EXISTS "View friends" ON friends;
DROP POLICY IF EXISTS "Manage friends" ON friends;
CREATE POLICY "View friends" ON friends FOR SELECT USING (true);
CREATE POLICY "Manage friends" ON friends FOR ALL USING (true);

-- Expenses & Splits
DROP POLICY IF EXISTS "View expenses" ON expenses;
DROP POLICY IF EXISTS "Insert expenses" ON expenses;
DROP POLICY IF EXISTS "View splits" ON expense_splits;
DROP POLICY IF EXISTS "Insert splits" ON expense_splits;
CREATE POLICY "View expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Insert expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "View splits" ON expense_splits FOR SELECT USING (true);
CREATE POLICY "Insert splits" ON expense_splits FOR INSERT WITH CHECK (true);

-- Settlements
DROP POLICY IF EXISTS "View settlements" ON settlements;
DROP POLICY IF EXISTS "Insert settlements" ON settlements;
CREATE POLICY "View settlements" ON settlements FOR SELECT USING (true);
CREATE POLICY "Insert settlements" ON settlements FOR INSERT WITH CHECK (true);

-- Receipt items, assignments, default splits, comments, activity logs
DROP POLICY IF EXISTS "Read receipt items" ON receipt_items;
CREATE POLICY "Read receipt items" ON receipt_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Read item assignments" ON item_assignments;
CREATE POLICY "Read item assignments" ON item_assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Read default splits" ON default_splits;
CREATE POLICY "Read default splits" ON default_splits FOR SELECT USING (true);
DROP POLICY IF EXISTS "Read comments" ON expense_comments;
CREATE POLICY "Read comments" ON expense_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Read activity logs" ON activity_logs;
CREATE POLICY "Read activity logs" ON activity_logs FOR SELECT USING (true);

-- 14. GROUP INVITATIONS (Real-time Email Invites & SMTP Token Flow)
CREATE TABLE IF NOT EXISTS group_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View invitations" ON group_invitations;
DROP POLICY IF EXISTS "Insert invitations" ON group_invitations;
CREATE POLICY "View invitations" ON group_invitations FOR SELECT USING (true);
CREATE POLICY "Insert invitations" ON group_invitations FOR INSERT WITH CHECK (true);

-- 15. PUSH NOTIFICATION SUBSCRIPTIONS (PWA Web Push Tokens)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role read all subscriptions" ON push_subscriptions;
CREATE POLICY "Service role read all subscriptions" ON push_subscriptions
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);


