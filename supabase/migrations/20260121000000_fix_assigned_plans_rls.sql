-- Fix RLS for Assigned Plans so Clients can see them

-- 1. Policies for assigned_workouts
-- Enable RLS just in case (though likely enabled)
alter table public.assigned_workouts enable row level security;

create policy "Clients can view their own workouts"
on public.assigned_workouts for select
using (
  auth.uid() in (
    select user_id from public.clients where id = client_id
  )
);

-- 2. Policies for assigned_diets
alter table public.assigned_diets enable row level security;

create policy "Clients can view their own diets"
on public.assigned_diets for select
using (
  auth.uid() in (
    select user_id from public.clients where id = client_id
  )
);
