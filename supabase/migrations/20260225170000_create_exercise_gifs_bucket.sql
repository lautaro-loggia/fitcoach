-- Create storage bucket for exercise GIFs
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('exercise-gifs', 'exercise-gifs', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Policy: Public can read exercise GIFs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Exercise GIFs Public Select'
          AND tablename = 'objects'
          AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Exercise GIFs Public Select"
            ON storage.objects
            FOR SELECT
            TO public
            USING (bucket_id = 'exercise-gifs');
    END IF;
END $$;

-- Policy: Authenticated users can upload exercise GIFs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Exercise GIFs Auth Insert'
          AND tablename = 'objects'
          AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Exercise GIFs Auth Insert"
            ON storage.objects
            FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = 'exercise-gifs');
    END IF;
END $$;

-- Policy: Authenticated users can update exercise GIFs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Exercise GIFs Auth Update'
          AND tablename = 'objects'
          AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Exercise GIFs Auth Update"
            ON storage.objects
            FOR UPDATE
            TO authenticated
            USING (bucket_id = 'exercise-gifs');
    END IF;
END $$;

-- Policy: Authenticated users can delete exercise GIFs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Exercise GIFs Auth Delete'
          AND tablename = 'objects'
          AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Exercise GIFs Auth Delete"
            ON storage.objects
            FOR DELETE
            TO authenticated
            USING (bucket_id = 'exercise-gifs');
    END IF;
END $$;
