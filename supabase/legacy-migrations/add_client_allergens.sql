-- Add allergens and dietary_preference columns to clients table

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS allergens text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dietary_preference text DEFAULT 'sin_restricciones';

-- Add comment to explain values
COMMENT ON COLUMN public.clients.allergens IS 'Array of allergens: Huevo, Pescado, Gluten, Lactosa, Leche, Frutos secos, Mani, Sesamo, Marisco, Soja';
COMMENT ON COLUMN public.clients.dietary_preference IS 'Vegetariana, Vegana, Sin restricciones';
