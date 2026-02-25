-- Harden storage access for meal logs and check-in images.
-- Restrict access to the owner client and its assigned trainer.

-- Ensure sensitive buckets stay private.
UPDATE storage.buckets
SET public = false
WHERE id IN ('meal-logs', 'checkin-images');

-- Remove legacy broad policies.
DROP POLICY IF EXISTS "Authenticated users can upload meal logs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view meal logs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload checkin images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view checkin images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload checkin images 1" ON storage.objects;
DROP POLICY IF EXISTS "Public can view checkin images 1" ON storage.objects;

-- meal-logs: folder prefix is clients.id
CREATE POLICY "Users can upload own/assigned meal logs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meal-logs'
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id::text = split_part(name, '/', 1)
      AND (c.user_id = auth.uid() OR c.trainer_id = auth.uid())
  )
);

CREATE POLICY "Users can read own/assigned meal logs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meal-logs'
  AND EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id::text = split_part(name, '/', 1)
      AND (c.user_id = auth.uid() OR c.trainer_id = auth.uid())
  )
);

-- checkin-images: folder prefix is clients.user_id
CREATE POLICY "Users can upload own/assigned checkin images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'checkin-images'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.user_id::text = split_part(name, '/', 1)
        AND c.trainer_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can read own/assigned checkin images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'checkin-images'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.user_id::text = split_part(name, '/', 1)
        AND c.trainer_id = auth.uid()
    )
  )
);
