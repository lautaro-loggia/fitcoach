-- Añadir columnas de preferencias de horarios de comidas a la tabla existente
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS reminder_time_desayuno time without time zone DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS reminder_time_almuerzo time without time zone DEFAULT '12:00:00',
ADD COLUMN IF NOT EXISTS reminder_time_merienda time without time zone DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS reminder_time_cena time without time zone DEFAULT '21:00:00';

-- Habilitar extensión pg_cron (este paso requiere permisos de superusuario en Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Eliminar tarea programada anterior si existe para evitar duplicados
DO $$ 
BEGIN
    PERFORM cron.unschedule('meal-reminders');
EXCEPTION WHEN OTHERS THEN
END $$;

-- Programar nueva tarea que corra cada 1 minuto
SELECT cron.schedule(
    'meal-reminders',
    '* * * * *',
    $$
        INSERT INTO public.notifications (user_id, type, title, body, data)
        SELECT 
            np.user_id,
            'meal_photo_reminder',
            'Hora del ' || m.name,
            'Recuerda registrar tu foto o detalles para el ' || m.name,
            jsonb_build_object('url', '/dashboard/diet', 'meal_id', m.id)
        FROM public.notification_preferences np
        JOIN auth.users u ON u.id = np.user_id
        JOIN public.clients c ON c.user_id = u.id
        JOIN public.weekly_meal_plans wmp ON wmp.client_id = c.id AND wmp.status = 'active'
        JOIN public.weekly_meal_plan_days wmpd ON wmpd.plan_id = wmp.id AND wmpd.day_of_week = EXTRACT(ISODOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')
        JOIN public.weekly_meal_plan_meals m ON m.day_id = wmpd.id
        WHERE np.meal_photo_reminder = true
        AND NOT EXISTS (
            -- Evitar enviar la misma notificación dos veces en el mismo día
            SELECT 1 FROM public.notifications n2 
            WHERE n2.user_id = np.user_id 
              AND n2.type = 'meal_photo_reminder'
              AND n2.data->>'meal_id' = m.id::text
              AND n2.created_at::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
        )
        AND (
            (LOWER(m.name) LIKE '%desayuno%' AND np.reminder_time_desayuno = date_trunc('minute', CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::time) OR
            (LOWER(m.name) LIKE '%almuerzo%' AND np.reminder_time_almuerzo = date_trunc('minute', CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::time) OR
            (LOWER(m.name) LIKE '%merienda%' AND np.reminder_time_merienda = date_trunc('minute', CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::time) OR
            (LOWER(m.name) LIKE '%cena%' AND np.reminder_time_cena = date_trunc('minute', CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::time)
        );
    $$
);
