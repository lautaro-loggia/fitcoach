-- Add avatar_url column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for client avatars
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('client-avatars', 'client-avatars', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Policy: Public Access Select (anyone can view avatars)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Client Avatars Public Select' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Client Avatars Public Select" ON storage.objects FOR SELECT TO public USING ( bucket_id = 'client-avatars' );
    END IF;
END $$;

-- Policy: Authenticated Upload
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Client Avatars Auth Insert' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Client Avatars Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'client-avatars' );
    END IF;
END $$;

-- Policy: Authenticated Update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Client Avatars Auth Update' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Client Avatars Auth Update" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'client-avatars' );
    END IF;
END $$;

-- Policy: Authenticated Delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Client Avatars Auth Delete' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Client Avatars Auth Delete" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'client-avatars' );
    END IF;
END $$;
