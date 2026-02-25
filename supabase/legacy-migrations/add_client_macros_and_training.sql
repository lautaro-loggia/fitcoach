-- Add training_frequency and macros to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS training_frequency INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS target_calories INTEGER DEFAULT 2000,
ADD COLUMN IF NOT EXISTS target_protein INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS target_carbs INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS target_fats INTEGER DEFAULT 65;

COMMENT ON COLUMN public.clients.training_frequency IS 'Days per week the client trains';
