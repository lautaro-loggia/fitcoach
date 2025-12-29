-- Admin Policies for Recipes Table
-- Allow 'lauloggia@gmail.com' (d172f729-a64c-451b-ab41-4d0ce916acf4) to full access

-- Helper to check if user is admin
-- Note: In a real app we might use app_metadata or a separate table, but for this quick fix we check ID directly or email logic in app.
-- RLS policies are SQL based.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all recipes' AND tablename = 'recipes'
    ) THEN
        CREATE POLICY "Admins can update all recipes"
        ON recipes
        FOR UPDATE
        TO authenticated
        USING ( auth.uid() = 'd172f729-a64c-451b-ab41-4d0ce916acf4'::uuid );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete all recipes' AND tablename = 'recipes'
    ) THEN
        CREATE POLICY "Admins can delete all recipes"
        ON recipes
        FOR DELETE
        TO authenticated
        USING ( auth.uid() = 'd172f729-a64c-451b-ab41-4d0ce916acf4'::uuid );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert all recipes' AND tablename = 'recipes'
    ) THEN
        CREATE POLICY "Admins can insert all recipes"
        ON recipes
        FOR INSERT
        TO authenticated
        WITH CHECK ( auth.uid() = 'd172f729-a64c-451b-ab41-4d0ce916acf4'::uuid );
    END IF;
END $$;
