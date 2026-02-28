-- Optimize RLS policies by wrapping auth helper calls in SELECT subqueries.
-- This follows Supabase's recommendation to avoid per-row re-evaluation.

DO $$
DECLARE
  policy_row record;
  old_qual text;
  old_with_check text;
  new_qual text;
  new_with_check text;
  ddl text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  LOOP
    old_qual := policy_row.qual;
    old_with_check := policy_row.with_check;
    new_qual := old_qual;
    new_with_check := old_with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := replace(new_qual, '(select auth.uid())', '__AUTH_UID_TOKEN__');
      new_qual := replace(new_qual, '(select auth.role())', '__AUTH_ROLE_TOKEN__');
      new_qual := replace(new_qual, '(select auth.jwt())', '__AUTH_JWT_TOKEN__');

      new_qual := regexp_replace(new_qual, '\bauth\.uid\(\)', '(select auth.uid())', 'g');
      new_qual := regexp_replace(new_qual, '\bauth\.role\(\)', '(select auth.role())', 'g');
      new_qual := regexp_replace(new_qual, '\bauth\.jwt\(\)', '(select auth.jwt())', 'g');

      new_qual := replace(new_qual, '__AUTH_UID_TOKEN__', '(select auth.uid())');
      new_qual := replace(new_qual, '__AUTH_ROLE_TOKEN__', '(select auth.role())');
      new_qual := replace(new_qual, '__AUTH_JWT_TOKEN__', '(select auth.jwt())');
    END IF;

    IF new_with_check IS NOT NULL THEN
      new_with_check := replace(new_with_check, '(select auth.uid())', '__AUTH_UID_TOKEN__');
      new_with_check := replace(new_with_check, '(select auth.role())', '__AUTH_ROLE_TOKEN__');
      new_with_check := replace(new_with_check, '(select auth.jwt())', '__AUTH_JWT_TOKEN__');

      new_with_check := regexp_replace(new_with_check, '\bauth\.uid\(\)', '(select auth.uid())', 'g');
      new_with_check := regexp_replace(new_with_check, '\bauth\.role\(\)', '(select auth.role())', 'g');
      new_with_check := regexp_replace(new_with_check, '\bauth\.jwt\(\)', '(select auth.jwt())', 'g');

      new_with_check := replace(new_with_check, '__AUTH_UID_TOKEN__', '(select auth.uid())');
      new_with_check := replace(new_with_check, '__AUTH_ROLE_TOKEN__', '(select auth.role())');
      new_with_check := replace(new_with_check, '__AUTH_JWT_TOKEN__', '(select auth.jwt())');
    END IF;

    IF new_qual IS DISTINCT FROM old_qual
       OR new_with_check IS DISTINCT FROM old_with_check THEN
      ddl := format(
        'alter policy %I on %I.%I',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename
      );

      IF new_qual IS NOT NULL THEN
        ddl := ddl || format(' using (%s)', new_qual);
      END IF;

      IF new_with_check IS NOT NULL THEN
        ddl := ddl || format(' with check (%s)', new_with_check);
      END IF;

      EXECUTE ddl;
    END IF;
  END LOOP;
END;
$$;
