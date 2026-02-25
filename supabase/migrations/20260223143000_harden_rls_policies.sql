-- Harden notifications and meal-plan RLS policies

-- Notifications: prevent authenticated users from creating notifications for other users.
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- weekly_meal_plans: fix client SELECT policy (client_id references clients.id, not auth.users.id)
DROP POLICY IF EXISTS "Clients can view their own plans" ON public.weekly_meal_plans;

CREATE POLICY "Clients can view their own plans"
ON public.weekly_meal_plans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = weekly_meal_plans.client_id
      AND c.user_id = auth.uid()
  )
);

-- Child tables were left with USING (true) for all authenticated users.
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.weekly_meal_plan_days;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.weekly_meal_plan_meals;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.weekly_meal_plan_items;

-- weekly_meal_plan_days
CREATE POLICY "Trainers can manage days for own clients"
ON public.weekly_meal_plan_days
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.weekly_meal_plans p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = weekly_meal_plan_days.plan_id
      AND c.trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.weekly_meal_plans p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = weekly_meal_plan_days.plan_id
      AND c.trainer_id = auth.uid()
  )
);

CREATE POLICY "Clients can view own plan days"
ON public.weekly_meal_plan_days
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.weekly_meal_plans p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = weekly_meal_plan_days.plan_id
      AND c.user_id = auth.uid()
  )
);

-- weekly_meal_plan_meals
CREATE POLICY "Trainers can manage meals for own clients"
ON public.weekly_meal_plan_meals
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.weekly_meal_plan_days d
    JOIN public.weekly_meal_plans p ON p.id = d.plan_id
    JOIN public.clients c ON c.id = p.client_id
    WHERE d.id = weekly_meal_plan_meals.day_id
      AND c.trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.weekly_meal_plan_days d
    JOIN public.weekly_meal_plans p ON p.id = d.plan_id
    JOIN public.clients c ON c.id = p.client_id
    WHERE d.id = weekly_meal_plan_meals.day_id
      AND c.trainer_id = auth.uid()
  )
);

CREATE POLICY "Clients can view own plan meals"
ON public.weekly_meal_plan_meals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.weekly_meal_plan_days d
    JOIN public.weekly_meal_plans p ON p.id = d.plan_id
    JOIN public.clients c ON c.id = p.client_id
    WHERE d.id = weekly_meal_plan_meals.day_id
      AND c.user_id = auth.uid()
  )
);

-- weekly_meal_plan_items
CREATE POLICY "Trainers can manage items for own clients"
ON public.weekly_meal_plan_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.weekly_meal_plan_meals m
    JOIN public.weekly_meal_plan_days d ON d.id = m.day_id
    JOIN public.weekly_meal_plans p ON p.id = d.plan_id
    JOIN public.clients c ON c.id = p.client_id
    WHERE m.id = weekly_meal_plan_items.meal_id
      AND c.trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.weekly_meal_plan_meals m
    JOIN public.weekly_meal_plan_days d ON d.id = m.day_id
    JOIN public.weekly_meal_plans p ON p.id = d.plan_id
    JOIN public.clients c ON c.id = p.client_id
    WHERE m.id = weekly_meal_plan_items.meal_id
      AND c.trainer_id = auth.uid()
  )
);

CREATE POLICY "Clients can view own plan items"
ON public.weekly_meal_plan_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.weekly_meal_plan_meals m
    JOIN public.weekly_meal_plan_days d ON d.id = m.day_id
    JOIN public.weekly_meal_plans p ON p.id = d.plan_id
    JOIN public.clients c ON c.id = p.client_id
    WHERE m.id = weekly_meal_plan_items.meal_id
      AND c.user_id = auth.uid()
  )
);
