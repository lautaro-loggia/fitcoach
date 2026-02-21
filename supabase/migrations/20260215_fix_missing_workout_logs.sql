
-- Fix missing workout_logs table
-- Based on definition from 20260121_client_app_tables.sql

create table if not exists public.workout_logs (
    id uuid not null default gen_random_uuid() primary key,
    client_id uuid not null references public.clients(id) on delete cascade,
    workout_id uuid references public.assigned_workouts(id) on delete set null,
    date date not null default current_date,
    completed_at timestamp with time zone not null default now(),
    exercises_log jsonb default '[]'::jsonb, -- Stores details of what was actually done
    feedback jsonb default '{}'::jsonb -- Added in 20260204
);

-- Enable RLS
alter table public.workout_logs enable row level security;

-- RLS Policies
drop policy if exists "Clients can view own workout logs" on public.workout_logs;
create policy "Clients can view own workout logs"
    on public.workout_logs for select
    using (auth.uid() in (
        select user_id from public.clients where id = workout_logs.client_id
    ));

drop policy if exists "Clients can insert own workout logs" on public.workout_logs;
create policy "Clients can insert own workout logs"
    on public.workout_logs for insert
    with check (auth.uid() in (
        select user_id from public.clients where id = workout_logs.client_id
    ));

drop policy if exists "Trainers can view their clients' workout logs" on public.workout_logs;
create policy "Trainers can view their clients' workout logs"
    on public.workout_logs for select
    using (auth.uid() in (
        select user_id from public.profiles
        join public.clients on clients.trainer_id = profiles.id
        where clients.id = workout_logs.client_id
    ));
