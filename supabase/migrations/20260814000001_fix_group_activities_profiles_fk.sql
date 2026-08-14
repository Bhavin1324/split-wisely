-- 1. Drop existing FK constraint pointing to auth.users if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'group_activities_actor_id_fkey'
    ) THEN
        ALTER TABLE public.group_activities 
        DROP CONSTRAINT group_activities_actor_id_fkey;
    END IF;
END $$;

-- 2. Add foreign key referencing public.profiles_base(id)
ALTER TABLE public.group_activities
ADD CONSTRAINT group_activities_actor_id_fkey 
FOREIGN KEY (actor_id) 
REFERENCES public.profiles_base(id) 
ON DELETE SET NULL;

-- 3. Reload PostgREST schema cache to immediately expose the relationship
NOTIFY pgrst, 'reload schema';

