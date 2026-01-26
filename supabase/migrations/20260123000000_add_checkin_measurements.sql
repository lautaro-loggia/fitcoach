-- Add body composition fields
ALTER TABLE checkins 
ADD COLUMN IF NOT EXISTS lean_mass numeric,
ADD COLUMN IF NOT EXISTS chest_measure numeric,
ADD COLUMN IF NOT EXISTS waist_measure numeric,
ADD COLUMN IF NOT EXISTS hip_measure numeric,
ADD COLUMN IF NOT EXISTS arm_measure numeric,
ADD COLUMN IF NOT EXISTS thigh_measure numeric,
ADD COLUMN IF NOT EXISTS calf_measure numeric,
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

-- Add photos bucket if not exists (handling this in a separate migration typically, but good to ensure logic exists)
-- Assuming a 'clients' bucket or 'checkins' bucket exists or we reuse one. 
-- The user didn't explicitly ask for a new bucket but "Subir foto".
-- Let's stick to table schema here.
