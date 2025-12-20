-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Trainers)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  email text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- CLIENTS
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) on delete cascade not null,
  full_name text not null,
  email text,
  phone text,
  status text check (status in ('active', 'inactive')) default 'active',
  
  -- Initial Data
  initial_weight numeric,
  height numeric,
  birth_date date,
  
  -- Goals
  goal_text text,
  goal_specific text, -- 'lose_fat', 'gain_muscle', 'recomp'
  activity_level text, -- 'sedentary', 'moderate', 'active'
  
  -- Targets
  target_weight numeric,
  target_fat numeric,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz 
);
alter table public.clients enable row level security;

create policy "Trainers can manage own clients" 
  on public.clients for all 
  using (auth.uid() = trainer_id);

-- CHECKINS
create table public.checkins (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  trainer_id uuid references public.profiles(id) on delete cascade not null, -- denormalized for RLS efficiency
  date date not null default current_date,
  
  weight numeric,
  body_fat numeric,
  lean_mass numeric,
  measurements jsonb, -- { chest, waist, hips, etc }
  observations text,
  photos text[], -- Array of storage paths
  
  created_at timestamptz default now()
);
alter table public.checkins enable row level security;

create policy "Trainers can manage own clients checkins" 
  on public.checkins for all 
  using (auth.uid() = trainer_id);

-- INGREDIENTS
create table public.ingredients (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) on delete cascade, -- Nullable for global ingredients? User said "Base de datos... Fuente única. Editable." "No impacta recetas ya asignadas"
  -- If global, trainer_id is null. IF editable, maybe each trainer has their own copy or extends global?
  -- "Fuente única" implies shared? But "Editable" implies changes. 
  -- Best approach: Global library (null trainer_id) + Private library (trainer_id).
  -- User said "Editable". If I edit "Chicken", does it change for everyone? Probably not.
  -- Let's make it private per trainer for simpler MVP, or Copy-on-write.
  -- "No impacta recetas ya asignadas" -> handled by Recipe snapshot.
  
  name text not null,
  calories numeric default 0,
  proteins numeric default 0,
  carbs numeric default 0,
  fats numeric default 0,
  
  created_at timestamptz default now()
);
alter table public.ingredients enable row level security;

create policy "Trainers can view global and own ingredients" 
  on public.ingredients for select 
  using (trainer_id is null or trainer_id = auth.uid());

create policy "Trainers can insert own ingredients" 
  on public.ingredients for insert 
  with check (trainer_id = auth.uid());

create policy "Trainers can update own ingredients" 
  on public.ingredients for update 
  using (trainer_id = auth.uid());

create policy "Trainers can delete own ingredients" 
  on public.ingredients for delete 
  using (trainer_id = auth.uid());


-- RECIPES (Templates)
create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  
  -- We could store ingredients as JSONB snapshot: [{ name, cals, p, c, f, grams }]
  ingredients jsonb default '[]'::jsonb,
  
  total_calories numeric,
  total_proteins numeric,
  total_carbs numeric,
  total_fats numeric,
  
  created_at timestamptz default now()
);
alter table public.recipes enable row level security;
create policy "Trainers can manage own recipes" 
  on public.recipes for all 
  using (auth.uid() = trainer_id);


-- WORKOUT TEMPLATES
create table public.workouts (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  days_count int default 1,
  
  -- JSONB for exercises: [{ day: 1, exercises: [{ name, sets, reps, ... }] }]
  structure jsonb default '[]'::jsonb,
  
  created_at timestamptz default now()
);
alter table public.workouts enable row level security;
create policy "Trainers can manage own workouts" 
  on public.workouts for all 
  using (auth.uid() = trainer_id);


-- ASSIGNMENTS (Plans)
-- "Templates y asignaciones personalizables"
-- We can store assignments in separate tables or use the same with a client_id?
-- "Clonado al asignar" -> New record in a dedicated 'plans' or 'assignments' table is better to distinguish templates.
-- Or simply add 'client_id' to recipes/workouts (if null = template, if set = assigned).
-- "Templates no se rompen por personalizaciones" -> This strongly suggests cloning.
-- Also `is_customized` flag.

-- ASSIGNED DIETS (Meal Plans)
create table public.assigned_diets (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text,
  
  -- Contains the meals/recipes snapshot
  data jsonb,
  
  is_customized boolean default false,
  origin_template_id uuid references public.recipes(id) on delete set null, -- Optional link to original template
  
  created_at timestamptz default now()
);
alter table public.assigned_diets enable row level security;
create policy "Trainers can manage own assigned diets" 
  on public.assigned_diets for all 
  using (auth.uid() = trainer_id);

-- ASSIGNED WORKOUTS
create table public.assigned_workouts (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text,
  
  structure jsonb,
  
  is_customized boolean default false,
  origin_template_id uuid references public.workouts(id) on delete set null,
  
  created_at timestamptz default now()
);
alter table public.assigned_workouts enable row level security;
create policy "Trainers can manage own assigned workouts" 
  on public.assigned_workouts for all 
  using (auth.uid() = trainer_id);


-- PAYMENTS
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  
  amount numeric not null,
  due_date date not null,
  paid_date date,
  status text check (status in ('pending', 'paid', 'overdue')) default 'pending',
  
  created_at timestamptz default now()
);
alter table public.payments enable row level security;
create policy "Trainers can manage own payments" 
  on public.payments for all 
  using (auth.uid() = trainer_id);

-- Storage Buckets (via SQL or dashboard? SQL for setup if possible)
-- insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false);
-- policies for storage...
