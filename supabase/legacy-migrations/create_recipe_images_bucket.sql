-- Create storage bucket for recipe images
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('recipe-images', 'recipe-images', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Policy: Public Access Select
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Recipe Images Public Select' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Recipe Images Public Select" ON storage.objects FOR SELECT TO public USING ( bucket_id = 'recipe-images' );
    END IF;
END $$;

-- Policy: Authenticated Upload
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Recipe Images Auth Insert' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Recipe Images Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'recipe-images' );
    END IF;
END $$;

-- Policy: Authenticated Update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Recipe Images Auth Update' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Recipe Images Auth Update" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'recipe-images' );
    END IF;
END $$;

-- Policy: Authenticated Delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Recipe Images Auth Delete' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Recipe Images Auth Delete" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'recipe-images' );
    END IF;
END $$;
