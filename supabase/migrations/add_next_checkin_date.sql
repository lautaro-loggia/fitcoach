-- Add next_checkin_date column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS next_checkin_date date;
