ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb;
