-- Testing phase guardrail:
-- limit each trainer to 15 active client records (non soft-deleted).
CREATE OR REPLACE FUNCTION public.enforce_active_clients_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_trainer uuid;
    occupied_slots integer;
    max_active_clients constant integer := 15;
    is_new_active boolean;
    was_old_active boolean;
BEGIN
    is_new_active := NEW.deleted_at IS NULL;
    was_old_active := TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL;

    -- Only enforce when the new row occupies an active slot.
    IF NOT is_new_active THEN
        RETURN NEW;
    END IF;

    -- No slot change: active row stays active with same trainer.
    IF TG_OP = 'UPDATE' AND was_old_active AND OLD.trainer_id = NEW.trainer_id THEN
        RETURN NEW;
    END IF;

    target_trainer := NEW.trainer_id;

    SELECT COUNT(*)::int
    INTO occupied_slots
    FROM public.clients c
    WHERE c.trainer_id = target_trainer
      AND c.deleted_at IS NULL
      AND c.id <> NEW.id;

    IF occupied_slots >= max_active_clients THEN
        RAISE EXCEPTION
            USING
                ERRCODE = 'P0001',
                MESSAGE = format('active_client_limit_reached: max %s', max_active_clients),
                DETAIL = format('Trainer %s already has %s active clients.', target_trainer, occupied_slots),
                HINT = 'Delete an active client before adding a new one.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_active_clients_limit_on_clients ON public.clients;

CREATE TRIGGER enforce_active_clients_limit_on_clients
BEFORE INSERT OR UPDATE OF trainer_id, deleted_at
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.enforce_active_clients_limit();
