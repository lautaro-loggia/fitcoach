
begin;

-- Enable RLS on storage.objects (safe to run even if enabled)
alter table storage.objects enable row level security;

-- Policy: Allow authenticated users to insert (upload) into checkin-images
-- We use DO blocks to avoid errors if policy exists, but standard SQL 'drop if exists' is cleaner
drop policy if exists "Authenticated users can upload checkin images 1" on storage.objects;

create policy "Authenticated users can upload checkin images 1"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'checkin-images' );

-- Policy: Allow public to view (select) from checkin-images
drop policy if exists "Public can view checkin images 1" on storage.objects;

create policy "Public can view checkin images 1"
on storage.objects for select
to public
using ( bucket_id = 'checkin-images' );

-- Also allow update/delete for owner if needed? Not for now.

commit;
