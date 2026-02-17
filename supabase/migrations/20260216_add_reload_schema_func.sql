-- Add a secure function to reload schema
CREATE OR REPLACE FUNCTION public.reload_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

-- Grant execute to authenticated users (or restrict to service_role)
GRANT EXECUTE ON FUNCTION public.reload_schema_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reload_schema_cache() TO service_role;
