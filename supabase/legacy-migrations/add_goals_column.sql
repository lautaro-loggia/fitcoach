-- Add goals JSONB column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.clients.goals IS 'Store miscellaneous goal data like timeframe, etc.';
