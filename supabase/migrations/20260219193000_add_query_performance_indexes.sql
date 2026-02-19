-- Query performance indexes for dashboard/client app hot paths

-- Clients lookup and dashboard filters
CREATE INDEX IF NOT EXISTS idx_clients_user_id
ON public.clients (user_id);

CREATE INDEX IF NOT EXISTS idx_clients_trainer_status
ON public.clients (trainer_id, status);

CREATE INDEX IF NOT EXISTS idx_clients_trainer_status_next_checkin_date
ON public.clients (trainer_id, status, next_checkin_date);

CREATE INDEX IF NOT EXISTS idx_clients_trainer_payment_status_next_due_date
ON public.clients (trainer_id, payment_status, next_due_date);

CREATE INDEX IF NOT EXISTS idx_clients_trainer_created_at
ON public.clients (trainer_id, created_at DESC);

-- Payments dashboards/history
CREATE INDEX IF NOT EXISTS idx_payments_trainer_paid_at
ON public.payments (trainer_id, paid_at DESC);

-- Assigned workouts lists and "today" resolution
CREATE INDEX IF NOT EXISTS idx_assigned_workouts_client_id
ON public.assigned_workouts (client_id);

CREATE INDEX IF NOT EXISTS idx_assigned_workouts_client_valid_until
ON public.assigned_workouts (client_id, valid_until);

CREATE INDEX IF NOT EXISTS idx_assigned_workouts_trainer_presential_valid_until
ON public.assigned_workouts (trainer_id, is_presential, valid_until);

CREATE INDEX IF NOT EXISTS idx_assigned_workouts_scheduled_days_gin
ON public.assigned_workouts USING gin (scheduled_days);

-- Check-ins and workout logs history queries
CREATE INDEX IF NOT EXISTS idx_checkins_client_date
ON public.checkins (client_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_workout_logs_client_date
ON public.workout_logs (client_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_workout_logs_client_workout_date
ON public.workout_logs (client_id, workout_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_workout_logs_client_workout_completed_at
ON public.workout_logs (client_id, workout_id, completed_at DESC);

-- workout_sessions may not exist in all local snapshots; guard creation.
DO $$
BEGIN
    IF to_regclass('public.workout_sessions') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_workout_started_at ON public.workout_sessions (client_id, assigned_workout_id, started_at DESC)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_status_started_at ON public.workout_sessions (client_id, status, started_at DESC)';
    END IF;
END
$$;
