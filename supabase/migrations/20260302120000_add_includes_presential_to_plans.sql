ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS includes_presential BOOLEAN DEFAULT false;

UPDATE public.plans
SET includes_presential = false
WHERE includes_presential IS NULL;

ALTER TABLE public.plans
ALTER COLUMN includes_presential SET DEFAULT false;

ALTER TABLE public.plans
ALTER COLUMN includes_presential SET NOT NULL;
