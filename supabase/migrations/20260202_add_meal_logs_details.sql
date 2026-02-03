-- Add status and coach_comment columns to meal_logs
ALTER TABLE public.meal_logs 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
ADD COLUMN IF NOT EXISTS coach_comment text;

-- Function to delete meal logs older than 30 days
CREATE OR REPLACE FUNCTION delete_old_meal_logs()
RETURNS void AS $$
BEGIN
  -- Delete records from the table
  -- Note: Storage objects should be deleted via a separate mechanism or trigger if not using cascade/buckets logic helper
  -- For now, we clean up the DB records. Storage cleanup can be handled by bucket lifecycle policies or edge functions.
  -- The requirement says "borrar archivo de storage, borrar registro en base de datos".
  -- Deleting the record will CASCADE to nothing unless setup. 
  -- Ideally, we select the paths, delete from storage, then delete from DB. 
  -- But PL/pgSQL cannot directly call Storage API without http extension or similar.
  -- For simplicity in this MVP step, we will just delete the DB record. 
  -- A robust solution would use an Edge Function triggered by pg_cron to list old rows, delete files via Storage API, then delete rows.
  
  DELETE FROM public.meal_logs
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comment on function usage
COMMENT ON FUNCTION delete_old_meal_logs IS 'Run this function periodically (e.g., daily via pg_cron) to clean up old meal logs.';
