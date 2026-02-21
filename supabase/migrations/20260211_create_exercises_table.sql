-- Create the exercises table
create table if not exists public.exercises (
  id text primary key, -- Original API ID
  name text not null, -- Spanish translated name
  english_name text, -- Original name for reference
  muscle_group text, -- Main muscle group (translated)
  equipment text, -- Equipment (translated)
  target text, -- Specific target muscle (translated)
  gif_url text, -- Visual URL (GIF or Image or Video)
  instructions text[], -- Array of instructions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Read-only for everyone, Write for service_role/admin)
alter table public.exercises enable row level security;

-- Policy: Everyone can read
drop policy if exists "Allow public read access" on public.exercises;
create policy "Allow public read access"
  on public.exercises
  for select
  to public
  using (true);

-- Policy: Only service role can insert/update/delete (for seeding)
drop policy if exists "Allow service role full access" on public.exercises;
create policy "Allow service role full access"
  on public.exercises
  for all
  to service_role
  using (true)
  with check (true);

-- Create search index for fast autocompletion
create index if not exists exercises_name_search_idx on public.exercises using gin(to_tsvector('spanish', name));
