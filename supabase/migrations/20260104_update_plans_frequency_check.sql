-- Drop the existing constraint
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_routine_frequency_check;

-- Add the updated constraint including new frequency types
ALTER TABLE public.plans ADD CONSTRAINT plans_routine_frequency_check
CHECK (routine_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'biannual'));
