-- Create a new table to avoid conflicts with existing interrupted schema
create table if not exists public.exercises_v2 (
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

-- Enable RLS
alter table public.exercises_v2 enable row level security;

-- Policies
drop policy if exists "Allow public read access v2" on public.exercises_v2;
create policy "Allow public read access v2"
  on public.exercises_v2
  for select
  to public
  using (true);

drop policy if exists "Allow service role full access v2" on public.exercises_v2;
create policy "Allow service role full access v2"
  on public.exercises_v2
  for all
  to service_role
  using (true)
  with check (true);

-- Indexes
create index if not exists exercises_v2_name_search_idx on public.exercises_v2 using gin(to_tsvector('spanish', name));
