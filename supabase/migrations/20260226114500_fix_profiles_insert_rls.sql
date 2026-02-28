-- Fix Advisor: RLS Policy Always True on public.profiles
-- Rebuild profiles policies explicitly to guarantee strict predicates.

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('drop policy %I on public.profiles', p.policyname);
  END LOOP;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = (select auth.uid())
);

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = (select auth.uid())
);

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = (select auth.uid())
)
WITH CHECK (
  id = (select auth.uid())
);
