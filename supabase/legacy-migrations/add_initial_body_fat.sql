-- Add initial_body_fat column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS initial_body_fat numeric;
