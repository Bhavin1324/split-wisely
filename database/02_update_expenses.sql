-- Add expense_date to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill expense_date with created_at if it's null
UPDATE expenses SET expense_date = created_at WHERE expense_date IS NULL;

-- Update create_expense_with_splits to accept p_expense_date
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
  p_expense_date TIMESTAMP WITH TIME ZONE,
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
    payer_id, receipt_image_url, created_by, expense_date
  ) VALUES (
    p_group_id, p_category_id, p_description, p_total_amount, 
    p_currency_code, p_exchange_rate, v_base_amount, 
    p_payer_id, p_receipt_image_url, p_created_by, COALESCE(p_expense_date, NOW())
  ) RETURNING id INTO v_expense_id;

  FOR v_split IN SELECT * FROM jsonb_to_recordset(p_splits) AS x(user_id UUID, amount_owed INT)
  LOOP
    INSERT INTO expense_splits (expense_id, user_id, amount_owed)
    VALUES (v_expense_id, v_split.user_id, v_split.amount_owed);
  END LOOP;

  RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create update_expense_with_splits RPC
CREATE OR REPLACE FUNCTION update_expense_with_splits(
  p_expense_id UUID,
  p_group_id UUID,
  p_category_id UUID,
  p_description TEXT,
  p_total_amount INTEGER,
  p_currency_code VARCHAR,
  p_exchange_rate DECIMAL,
  p_payer_id UUID,
  p_receipt_image_url TEXT,
  p_expense_date TIMESTAMP WITH TIME ZONE,
  p_splits JSONB
) RETURNS VOID AS $$
DECLARE
  v_base_amount INTEGER;
  v_split RECORD;
BEGIN
  v_base_amount := ROUND(p_total_amount * p_exchange_rate);
  
  -- Update expense
  UPDATE expenses
  SET
    group_id = p_group_id,
    category_id = p_category_id,
    description = p_description,
    total_amount = p_total_amount,
    currency_code = p_currency_code,
    exchange_rate = p_exchange_rate,
    base_currency_amount = v_base_amount,
    payer_id = p_payer_id,
    receipt_image_url = p_receipt_image_url,
    expense_date = COALESCE(p_expense_date, NOW()),
    updated_at = NOW()
  WHERE id = p_expense_id;

  -- Delete existing splits
  DELETE FROM expense_splits WHERE expense_id = p_expense_id;

  -- Insert new splits
  FOR v_split IN SELECT * FROM jsonb_to_recordset(p_splits) AS x(user_id UUID, amount_owed INT)
  LOOP
    INSERT INTO expense_splits (expense_id, user_id, amount_owed)
    VALUES (p_expense_id, v_split.user_id, v_split.amount_owed);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create delete_expense RPC
CREATE OR REPLACE FUNCTION delete_expense(p_expense_id UUID) RETURNS VOID AS $$
BEGIN
  DELETE FROM expense_splits WHERE expense_id = p_expense_id;
  DELETE FROM expenses WHERE id = p_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
