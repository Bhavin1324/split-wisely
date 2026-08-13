-- ============================================================================
-- 05_user_friends.sql: Standalone User Friends Mapping Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'ACCEPTED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

-- Grant permissions to PostgREST API roles
GRANT ALL ON TABLE public.user_friends TO authenticated, anon, service_role;

-- RLS Policies
DROP POLICY IF EXISTS "Allow users to select their friendships" ON public.user_friends;
DROP POLICY IF EXISTS "Allow users to create friendships" ON public.user_friends;
DROP POLICY IF EXISTS "Allow users to delete their friendships" ON public.user_friends;
DROP POLICY IF EXISTS "View user friends" ON public.user_friends;
DROP POLICY IF EXISTS "Manage user friends" ON public.user_friends;

CREATE POLICY "Allow users to select their friendships"
  ON public.user_friends FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Allow users to create friendships"
  ON public.user_friends FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their friendships"
  ON public.user_friends FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
