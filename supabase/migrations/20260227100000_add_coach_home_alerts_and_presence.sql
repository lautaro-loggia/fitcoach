-- Coach home alerts, presence heartbeat, and query indexes

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS last_app_opened_at timestamptz;

ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS coach_urgent_alert boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS coach_retention_alert boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS coach_weekly_milestone boolean DEFAULT true;

-- Notifications queries used by cooldown dedupe (user + type + recent created_at)
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created_at
ON public.notifications (user_id, type, created_at DESC);

-- Optional acceleration for alert key lookup inside json payload
CREATE INDEX IF NOT EXISTS idx_notifications_alert_key
ON public.notifications ((data->>'alert_key'))
WHERE data ? 'alert_key';

-- Meal logs pending-review and timeline queries
CREATE INDEX IF NOT EXISTS idx_meal_logs_client_status_created_at
ON public.meal_logs (client_id, status, created_at DESC);

-- Checkin recency query (if not already covered by date index)
CREATE INDEX IF NOT EXISTS idx_checkins_client_created_at
ON public.checkins (client_id, created_at DESC);

-- workout_sessions may not exist in all local snapshots; guard index creation.
DO $$
BEGIN
    IF to_regclass('public.workout_sessions') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_status_ended_at ON public.workout_sessions (client_id, status, ended_at DESC)';
    END IF;
END
$$;
