-- Change photos column to JSONB to support structured data (url, type)
ALTER TABLE checkins ALTER COLUMN photos DROP DEFAULT;
ALTER TABLE checkins ALTER COLUMN photos TYPE jsonb USING to_jsonb(photos);
ALTER TABLE checkins ALTER COLUMN photos SET DEFAULT '[]'::jsonb;

-- Create storage bucket for checkin images if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checkin-images', 'checkin-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload images
-- (This might need adjustment based on specific RLS needs, assuming authenticated 'authenticated' role)
CREATE POLICY "Authenticated users can upload checkin images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'checkin-images' );

CREATE POLICY "Authenticated users can view checkin images"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'checkin-images' );
