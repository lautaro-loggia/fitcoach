-- Client App & Onboarding Schema Updates

-- 1. Add user_id FK to auth.users
alter table public.clients 
add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 2. Add Onboarding Status
alter table public.clients 
add column if not exists onboarding_status text check (onboarding_status in ('invited', 'in_progress', 'completed')) default 'invited';

-- 3. Update Operational Status (Expand existing status column)
-- First drop existing check if strictly constrained, or just add new values via constraint replacement
alter table public.clients drop constraint if exists clients_status_check;
alter table public.clients add constraint clients_status_check check (status in ('active', 'inactive', 'paused', 'archived'));

-- 4. Add Planning Status
alter table public.clients 
add column if not exists planning_status text check (planning_status in ('pending', 'planned')) default 'pending';

-- 5. Add Core Columns
alter table public.clients 
add column if not exists main_goal text,
add column if not exists current_weight numeric;

-- 6. Add Contextual JSONB Columns
alter table public.clients 
add column if not exists injuries jsonb default '[]'::jsonb,
add column if not exists dietary_info jsonb default '{}'::jsonb,
add column if not exists training_availability jsonb default '{}'::jsonb;

-- 7. Add Unique Email Constraint (1 Client = 1 Coach MVP)
-- SKIPPED DUE TO DATA DUPLICATES (ulitester2003@gmail.com)
-- alter table public.clients add constraint clients_email_key unique (email);

-- 8. RLS Policies
-- Clients can VIEW their own record
create policy "Clients can view own profile" 
on public.clients for select 
using (auth.uid() = user_id);

-- Note: We do NOT add an UPDATE policy for clients. Updates must happen via Server Functions.
