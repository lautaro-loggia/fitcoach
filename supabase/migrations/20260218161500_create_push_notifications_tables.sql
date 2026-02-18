-- Tabla para suscripciones Push (dispositivos)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Users manage own subscriptions'
    ) THEN
        CREATE POLICY "Users manage own subscriptions"
          ON public.push_subscriptions FOR ALL
          USING (auth.uid() = user_id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON public.push_subscriptions(endpoint);


-- Tabla para preferencias de notificaciones
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Coach preferences
  checkin_completed boolean DEFAULT true,
  workout_completed boolean DEFAULT true,
  payment_registered boolean DEFAULT true,
  new_client boolean DEFAULT true,
  
  -- Client preferences
  checkin_reminder boolean DEFAULT true,
  workout_assigned boolean DEFAULT true,
  coach_feedback boolean DEFAULT true,
  meal_photo_reminder boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users manage own preferences'
    ) THEN
        CREATE POLICY "Users manage own preferences"
          ON public.notification_preferences FOR ALL
          USING (auth.uid() = user_id);
    END IF;
END $$;


-- Tabla para cola de notificaciones (historial)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, 
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb, 
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications'
    ) THEN
        CREATE POLICY "Users can view own notifications"
          ON public.notifications FOR SELECT
          USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Authenticated users can insert notifications'
    ) THEN
        CREATE POLICY "Authenticated users can insert notifications"
          ON public.notifications FOR INSERT
          WITH CHECK (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
