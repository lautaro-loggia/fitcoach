-- Add payment fields to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS price_monthly NUMERIC;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'weekly', 'custom'));
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'overdue'));
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS next_due_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_paid_at DATE;

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  paid_at DATE NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'mercado_pago', 'other')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments
CREATE POLICY "Trainers can view own payments" 
  ON public.payments FOR SELECT 
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert own payments" 
  ON public.payments FOR INSERT 
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update own payments" 
  ON public.payments FOR UPDATE 
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete own payments" 
  ON public.payments FOR DELETE 
  USING (auth.uid() = trainer_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_trainer_id ON public.payments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_clients_payment_status ON public.clients(payment_status);
CREATE INDEX IF NOT EXISTS idx_clients_next_due_date ON public.clients(next_due_date);
