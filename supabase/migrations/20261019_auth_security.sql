-- Run the inspection queries in Supabase SQL Editor before applying changes.
-- Case-insensitive uniqueness, with duplicate checks first.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.profiles
   WHERE username IS NOT NULL
   GROUP BY lower(username) HAVING count(*) > 1
 ) THEN
   RAISE EXCEPTION 'Duplicate usernames found. Resolve them before migrating.';
 END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_lower
ON public.profiles (lower(username))
WHERE username IS NOT NULL;

-- Only authenticated users may edit their own profile.
-- Existing policies are retained; inspect them for overly permissive UPDATE rules.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Account owners can update their own profile" ON public.profiles;
CREATE POLICY "Account owners can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);
