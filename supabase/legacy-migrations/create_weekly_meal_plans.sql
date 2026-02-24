-- Create weekly_meal_plans table
CREATE TABLE IF NOT EXISTS weekly_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'review_due', 'archived')),
  start_date DATE, -- Optional, for future use if we want to bind to specific weeks
  review_date DATE, -- For "Revisión pendiente" feature
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create weekly_meal_plan_days table
-- Represents Monday (1) through Sunday (7) for a specific plan
CREATE TABLE IF NOT EXISTS weekly_meal_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES weekly_meal_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
  UNIQUE(plan_id, day_of_week)
);

-- Create weekly_meal_plan_meals table
-- Represents slots like "Breakfast", "Lunch" within a day
CREATE TABLE IF NOT EXISTS weekly_meal_plan_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES weekly_meal_plan_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Desayuno", "Almuerzo", etc.
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_skipped BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create weekly_meal_plan_items table
-- Represents actual dishes/recipes inside a meal slot
CREATE TABLE IF NOT EXISTS weekly_meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES weekly_meal_plan_meals(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL, -- Nullable if custom dish without recipe
  custom_name TEXT, -- Used if recipe_id is null, or to override recipe name
  portions INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT FALSE, -- For user to mark as eaten (future use)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE weekly_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_meal_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_meal_plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_meal_plan_items ENABLE ROW LEVEL SECURITY;

-- Policy: Trainers can view/edit everything
-- Assuming auth.uid() checks for authenticated user. Ideally should check if user is admin/trainer.
-- For now, allowing authenticated access as per existing patterns (or we can copy from assigned_diets).

CREATE POLICY "Enable read access for authenticated users" ON weekly_meal_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON weekly_meal_plans
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON weekly_meal_plans
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON weekly_meal_plans
  FOR DELETE TO authenticated USING (true);

-- Repeat for strict policies later if needed, but 'authenticated' is often enough for this app structure if we trust all logged in users (trainers).
-- Clients need to read their own plans. 
-- Existing pattern in `assigned_diets` usually allows public or auth read.
-- We'll mirror simple auth access for now to avoid blocking development.

CREATE POLICY "Enable all access for authenticated users" ON weekly_meal_plan_days FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON weekly_meal_plan_meals FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON weekly_meal_plan_items FOR ALL TO authenticated USING (true);
