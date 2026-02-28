-- Fix remaining Supabase Advisor findings:
-- 1) Function Search Path Mutable
-- 2) Multiple Permissive Policies on assigned_* tables
-- 3) Auth RLS Initialization Plan on assigned_* tables

-- 1) Lock function search_path
DO $$
BEGIN
  IF to_regprocedure('public.delete_old_meal_logs()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.delete_old_meal_logs() SET search_path = pg_catalog, public';
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('public.handle_checkin_note_update()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.handle_checkin_note_update() SET search_path = pg_catalog, public';
  END IF;
END;
$$;

-- 2) Reset policies on assigned_diets to remove duplicates
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assigned_diets'
  LOOP
    EXECUTE format('drop policy %I on public.assigned_diets', p.policyname);
  END LOOP;
END;
$$;

ALTER TABLE public.assigned_diets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assigned_diets_select_trainer_or_client"
ON public.assigned_diets
FOR SELECT
TO authenticated
USING (
  trainer_id = (select auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = assigned_diets.client_id
      AND c.user_id = (select auth.uid())
  )
);

CREATE POLICY "assigned_diets_insert_trainer"
ON public.assigned_diets
FOR INSERT
TO authenticated
WITH CHECK (
  trainer_id = (select auth.uid())
);

CREATE POLICY "assigned_diets_update_trainer"
ON public.assigned_diets
FOR UPDATE
TO authenticated
USING (
  trainer_id = (select auth.uid())
)
WITH CHECK (
  trainer_id = (select auth.uid())
);

CREATE POLICY "assigned_diets_delete_trainer"
ON public.assigned_diets
FOR DELETE
TO authenticated
USING (
  trainer_id = (select auth.uid())
);

-- 3) Reset policies on assigned_workouts to remove duplicates
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assigned_workouts'
  LOOP
    EXECUTE format('drop policy %I on public.assigned_workouts', p.policyname);
  END LOOP;
END;
$$;

ALTER TABLE public.assigned_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assigned_workouts_select_trainer_or_client"
ON public.assigned_workouts
FOR SELECT
TO authenticated
USING (
  trainer_id = (select auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = assigned_workouts.client_id
      AND c.user_id = (select auth.uid())
  )
);

CREATE POLICY "assigned_workouts_insert_trainer"
ON public.assigned_workouts
FOR INSERT
TO authenticated
WITH CHECK (
  trainer_id = (select auth.uid())
);

CREATE POLICY "assigned_workouts_update_trainer"
ON public.assigned_workouts
FOR UPDATE
TO authenticated
USING (
  trainer_id = (select auth.uid())
)
WITH CHECK (
  trainer_id = (select auth.uid())
);

CREATE POLICY "assigned_workouts_delete_trainer"
ON public.assigned_workouts
FOR DELETE
TO authenticated
USING (
  trainer_id = (select auth.uid())
);
