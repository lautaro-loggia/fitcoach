-- 1. Crear la tabla de registros de comida (Si no existe)
CREATE TABLE IF NOT EXISTS public.meal_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    image_path text NOT NULL,
    meal_type text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
    coach_comment text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Habilitar la seguridad (RLS)
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

-- 3. Crear las políticas de acceso (Eliminando las anteriores para evitar duplicados)
DROP POLICY IF EXISTS "Clients can view own meal logs" ON public.meal_logs;
CREATE POLICY "Clients can view own meal logs"
    ON public.meal_logs FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM public.clients WHERE id = meal_logs.client_id
    ));

DROP POLICY IF EXISTS "Clients can insert own meal logs" ON public.meal_logs;
CREATE POLICY "Clients can insert own meal logs"
    ON public.meal_logs FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM public.clients WHERE id = meal_logs.client_id
    ));

DROP POLICY IF EXISTS "Trainers can view their clients' meal logs" ON public.meal_logs;
CREATE POLICY "Trainers can view their clients' meal logs"
    ON public.meal_logs FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM public.profiles
        JOIN public.clients ON clients.trainer_id = profiles.id
        WHERE clients.id = meal_logs.client_id
    ));

-- 4. Permisos importantes para que la API funcione
GRANT ALL ON TABLE public.meal_logs TO authenticated;
GRANT ALL ON TABLE public.meal_logs TO service_role;

-- 5. Recargar la caché del esquema (Vital para quitar el error "schema cache")
NOTIFY pgrst, 'reload schema';
