-- Ensure reminder preferences exist for all users and make meal reminders resilient to missing rows.

-- 1) Backfill notification preferences for existing users.
INSERT INTO public.notification_preferences (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.notification_preferences np ON np.user_id = u.id
WHERE np.user_id IS NULL;

-- 2) Auto-create notification preferences for future users.
CREATE OR REPLACE FUNCTION public.ensure_notification_preferences_on_auth_user_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_notification_preferences_on_auth_user_insert ON auth.users;
CREATE TRIGGER ensure_notification_preferences_on_auth_user_insert
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.ensure_notification_preferences_on_auth_user_insert();

-- 3) Recreate cron job so reminders work even if a user is missing preference rows.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    PERFORM cron.unschedule('meal-reminders');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

SELECT cron.schedule(
    'meal-reminders',
    '* * * * *',
    $$
        WITH now_ctx AS (
            SELECT
                date_trunc('minute', CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::time AS now_minute,
                (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS today_art,
                EXTRACT(ISODOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::int AS day_of_week_art
        )
        INSERT INTO public.notifications (user_id, type, title, body, data)
        SELECT
            c.user_id,
            'meal_photo_reminder',
            'Hora del ' || m.name,
            'Recuerda registrar tu foto o detalles para el ' || m.name,
            jsonb_build_object('url', '/dashboard/diet', 'meal_id', m.id)
        FROM now_ctx ctx
        JOIN public.clients c ON c.user_id IS NOT NULL
        JOIN public.weekly_meal_plans wmp ON wmp.client_id = c.id AND wmp.status = 'active'
        JOIN public.weekly_meal_plan_days wmpd ON wmpd.plan_id = wmp.id AND wmpd.day_of_week = ctx.day_of_week_art
        JOIN public.weekly_meal_plan_meals m ON m.day_id = wmpd.id
        LEFT JOIN public.notification_preferences np ON np.user_id = c.user_id
        WHERE COALESCE(np.meal_photo_reminder, true) = true
          AND COALESCE(m.is_skipped, false) = false
          AND NOT EXISTS (
              SELECT 1
              FROM public.notifications n2
              WHERE n2.user_id = c.user_id
                AND n2.type = 'meal_photo_reminder'
                AND n2.data->>'meal_id' = m.id::text
                AND (n2.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = ctx.today_art
          )
          AND (
              (LOWER(m.name) LIKE '%desayuno%' AND COALESCE(np.reminder_time_desayuno, '09:00:00'::time) = ctx.now_minute) OR
              (LOWER(m.name) LIKE '%almuerzo%' AND COALESCE(np.reminder_time_almuerzo, '12:00:00'::time) = ctx.now_minute) OR
              (LOWER(m.name) LIKE '%merienda%' AND COALESCE(np.reminder_time_merienda, '17:00:00'::time) = ctx.now_minute) OR
              (LOWER(m.name) LIKE '%cena%' AND COALESCE(np.reminder_time_cena, '21:00:00'::time) = ctx.now_minute)
          );
    $$
);
