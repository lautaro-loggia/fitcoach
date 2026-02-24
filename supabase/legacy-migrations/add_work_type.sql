-- Add work_type column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS work_type text CHECK (work_type IN ('home_office', 'physical'));
