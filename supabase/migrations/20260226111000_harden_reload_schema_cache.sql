-- Harden reload_schema_cache security:
-- - fixed search_path on SECURITY DEFINER function
-- - remove authenticated execution
-- - keep service_role execution

CREATE OR REPLACE FUNCTION public.reload_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

REVOKE ALL ON FUNCTION public.reload_schema_cache() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reload_schema_cache() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reload_schema_cache() TO service_role;
