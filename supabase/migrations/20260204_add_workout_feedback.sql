ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb;
