-- Add notes, valid_until and scheduled_days to assigned_workouts table

ALTER TABLE public.assigned_workouts 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS valid_until DATE,
ADD COLUMN IF NOT EXISTS scheduled_days TEXT[];
