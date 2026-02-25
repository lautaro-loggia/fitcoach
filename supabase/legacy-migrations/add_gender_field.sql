-- Add gender column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female'));
