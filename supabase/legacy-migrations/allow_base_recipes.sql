-- Allow all trainers to view base template recipes
-- Base recipes have is_base_template = true and can be duplicated by any trainer

-- Drop the old policy
drop policy if exists "Trainers can manage own recipes" on public.recipes;

-- Create separate policies for better control
create policy "Trainers can view own and base recipes" 
  on public.recipes for select 
  using (
    auth.uid() = trainer_id 
    OR is_base_template = true
  );

create policy "Trainers can insert own recipes" 
  on public.recipes for insert 
  with check (auth.uid() = trainer_id);

create policy "Trainers can update own recipes" 
  on public.recipes for update 
  using (auth.uid() = trainer_id);

create policy "Trainers can delete own recipes" 
  on public.recipes for delete 
  using (auth.uid() = trainer_id);
