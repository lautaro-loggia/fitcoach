-- Create a new private bucket for meal logs
insert into storage.buckets (id, name, public)
values ('meal-logs', 'meal-logs', false)
on conflict (id) do nothing;

-- Values for RLS policies
-- Allow Clients to INSERT (Upload) their own files
-- We rely on the naming convention or folder structure 'client_id/filename' but simplistic RLS for now:
-- Storage policies are often tricky in SQL, usually needing helper functions.
-- Simplest: Authenticated users can upload.

create policy "Authenticated users can upload meal logs"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'meal-logs' );

create policy "Authenticated users can view meal logs"
on storage.objects for select
to authenticated
using ( bucket_id = 'meal-logs' );
