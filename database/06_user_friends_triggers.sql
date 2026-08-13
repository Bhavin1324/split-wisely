-- ============================================================================
-- 06_user_friends_triggers.sql: Automatic Friendship Triggers & Functions
-- ============================================================================

-- Function to handle automatic mutual friendship insertion when a user joins a group
CREATE OR REPLACE FUNCTION public.handle_group_member_friendship()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Insert friendship: (NEW.user_id -> existing members) as ACCEPTED
  INSERT INTO public.user_friends (user_id, friend_id, status)
  SELECT NEW.user_id, gm.user_id, 'ACCEPTED'
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id AND gm.user_id <> NEW.user_id
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'ACCEPTED';

  -- 2. Insert reverse friendship: (existing members -> NEW.user_id) as ACCEPTED
  INSERT INTO public.user_friends (user_id, friend_id, status)
  SELECT gm.user_id, NEW.user_id, 'ACCEPTED'
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id AND gm.user_id <> NEW.user_id
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'ACCEPTED';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on group_members AFTER INSERT
DROP TRIGGER IF EXISTS trg_group_member_friendship ON public.group_members;

CREATE TRIGGER trg_group_member_friendship
AFTER INSERT ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_group_member_friendship();

-- Backfill existing group co-members into public.user_friends
INSERT INTO public.user_friends (user_id, friend_id, status)
SELECT DISTINCT gm1.user_id, gm2.user_id, 'ACCEPTED'
FROM public.group_members gm1
JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id AND gm1.user_id <> gm2.user_id
ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'ACCEPTED';
