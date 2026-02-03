ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS daily_steps_target integer DEFAULT 10000;
