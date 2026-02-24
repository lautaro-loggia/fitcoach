-- Add wizard fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS waist_circumference NUMERIC,
ADD COLUMN IF NOT EXISTS training_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS goal_deadline TEXT,
ADD COLUMN IF NOT EXISTS meals_per_day INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS diet_experience TEXT DEFAULT 'intermediate';

COMMENT ON COLUMN public.clients.waist_circumference IS 'Waist circumference in cm';
COMMENT ON COLUMN public.clients.training_duration_minutes IS 'Average training duration in minutes';
COMMENT ON COLUMN public.clients.diet_experience IS 'Experience level: beginner, intermediate, advanced';
