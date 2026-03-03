-- Keep invited/in-progress clients as operationally pending until onboarding is completed.
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_status_check;

ALTER TABLE public.clients
ADD CONSTRAINT clients_status_check
CHECK (status IN ('pending', 'active', 'inactive', 'paused', 'archived'));

UPDATE public.clients
SET status = 'pending'
WHERE onboarding_status IN ('invited', 'in_progress')
  AND status IS DISTINCT FROM 'pending';
