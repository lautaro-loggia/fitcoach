-- Create meal_logs table
create table if not exists public.meal_logs (
    id uuid not null default gen_random_uuid() primary key,
    client_id uuid not null references public.clients(id) on delete cascade,
    image_path text not null, -- Supabase Storage path
    meal_type text, -- e.g., 'lunch', 'dinner', 'snack', or null
    created_at timestamp with time zone not null default now()
);

-- Create workout_logs table
create table if not exists public.workout_logs (
    id uuid not null default gen_random_uuid() primary key,
    client_id uuid not null references public.clients(id) on delete cascade,
    workout_id uuid references public.assigned_workouts(id) on delete set null,
    date date not null default current_date,
    completed_at timestamp with time zone not null default now(),
    exercises_log jsonb default '[]'::jsonb -- Stores details of what was actually done
);

-- Enable RLS
alter table public.meal_logs enable row level security;
alter table public.workout_logs enable row level security;

-- RLS Policies for meal_logs
create policy "Clients can view own meal logs"
    on public.meal_logs for select
    using (auth.uid() in (
        select user_id from public.clients where id = meal_logs.client_id
    ));

create policy "Clients can insert own meal logs"
    on public.meal_logs for insert
    with check (auth.uid() in (
        select user_id from public.clients where id = meal_logs.client_id
    ));

-- RLS Policies for workout_logs
create policy "Clients can view own workout logs"
    on public.workout_logs for select
    using (auth.uid() in (
        select user_id from public.clients where id = workout_logs.client_id
    ));

create policy "Clients can insert own workout logs"
    on public.workout_logs for insert
    with check (auth.uid() in (
        select user_id from public.clients where id = workout_logs.client_id
    ));

-- Coaches (Admins) should be able to view logs (Assuming admin role or using service role in app)
-- If using RLS for coaches, we'd add policies here. For now, assuming Admin Client use or specific Trainer policies.
-- Adding Trainer visibility policies just in case:

create policy "Trainers can view their clients' meal logs"
    on public.meal_logs for select
    using (auth.uid() in (
        select user_id from public.profiles
        join public.clients on clients.trainer_id = profiles.id
        where clients.id = meal_logs.client_id
    ));

create policy "Trainers can view their clients' workout logs"
    on public.workout_logs for select
    using (auth.uid() in (
        select user_id from public.profiles
        join public.clients on clients.trainer_id = profiles.id
        where clients.id = workout_logs.client_id
    ));
