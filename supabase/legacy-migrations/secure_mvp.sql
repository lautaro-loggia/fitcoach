-- Secure functions by setting search_path
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.delete_user() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Secure weekly_meal_plans RLS
-- First drop existing permissive policies
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.weekly_meal_plans;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.weekly_meal_plans;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.weekly_meal_plans;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.weekly_meal_plans;

-- Admin Policy
CREATE POLICY "Admins can do everything on plans"
ON public.weekly_meal_plans
FOR ALL
TO authenticated
USING (auth.uid() = 'd172f729-a64c-451b-ab41-4d0ce916acf4'::uuid)
WITH CHECK (auth.uid() = 'd172f729-a64c-451b-ab41-4d0ce916acf4'::uuid);

-- Trainer Policy (Trainers manage plans for clients they are assigned to)
CREATE POLICY "Trainers can manage plans for their clients"
ON public.weekly_meal_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = weekly_meal_plans.client_id
    AND c.trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = weekly_meal_plans.client_id
    AND c.trainer_id = auth.uid()
  )
);

-- Client Policy (Clients can read their own plans)
CREATE POLICY "Clients can view their own plans"
ON public.weekly_meal_plans
FOR SELECT
TO authenticated
USING ( client_id = auth.uid() );
