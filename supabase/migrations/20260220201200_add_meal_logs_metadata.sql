-- Agregar columna metadata tipo jsonb a la tabla meal_logs
ALTER TABLE public.meal_logs
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
