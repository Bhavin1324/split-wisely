-- Update RLS policies for groups to allow deletion
DROP POLICY IF EXISTS "Manage groups" ON groups;
CREATE POLICY "Manage groups" ON groups FOR ALL USING (true);

-- Update RLS policies for group_members to allow deletion
DROP POLICY IF EXISTS "Manage group members" ON group_members;
CREATE POLICY "Manage group members" ON group_members FOR ALL USING (true);

-- Update RLS policies for expenses to allow deletion
DROP POLICY IF EXISTS "Manage expenses" ON expenses;
CREATE POLICY "Manage expenses" ON expenses FOR ALL USING (true);

-- Update RLS policies for expense splits
DROP POLICY IF EXISTS "Manage splits" ON expense_splits;
CREATE POLICY "Manage splits" ON expense_splits FOR ALL USING (true);
