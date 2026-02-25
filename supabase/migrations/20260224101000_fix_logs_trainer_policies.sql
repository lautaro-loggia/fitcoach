-- Fix trainer visibility policies on logs.
-- Previous variants referenced profiles.user_id, a column that does not exist.

DROP POLICY IF EXISTS "Trainers can view their clients' meal logs" ON public.meal_logs;
CREATE POLICY "Trainers can view their clients' meal logs"
ON public.meal_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = meal_logs.client_id
      AND c.trainer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Trainers can view their clients' workout logs" ON public.workout_logs;
CREATE POLICY "Trainers can view their clients' workout logs"
ON public.workout_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = workout_logs.client_id
      AND c.trainer_id = auth.uid()
  )
);
