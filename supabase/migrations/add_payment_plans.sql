-- Create plans table for payment plans
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price_monthly NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for plans
CREATE POLICY "Trainers can view own plans" 
  ON public.plans FOR SELECT 
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert own plans" 
  ON public.plans FOR INSERT 
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update own plans" 
  ON public.plans FOR UPDATE 
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete own plans" 
  ON public.plans FOR DELETE 
  USING (auth.uid() = trainer_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plans_trainer_id ON public.plans(trainer_id);

-- Add plan_id column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

-- Create index for plan_id
CREATE INDEX IF NOT EXISTS idx_clients_plan_id ON public.clients(plan_id);
