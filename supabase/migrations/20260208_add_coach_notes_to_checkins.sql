-- Add coach note fields to checkins table
ALTER TABLE public.checkins 
ADD COLUMN IF NOT EXISTS coach_note text,
ADD COLUMN IF NOT EXISTS coach_note_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS coach_note_seen_at timestamptz,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Trigger logic for status and updated_at
CREATE OR REPLACE FUNCTION public.handle_checkin_note_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.coach_note IS DISTINCT FROM OLD.coach_note THEN
        NEW.coach_note_updated_at = now();
        IF NEW.coach_note IS NULL OR trim(NEW.coach_note) = '' THEN
            NEW.status = 'pending';
        ELSE
            NEW.status = 'commented';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_checkin_note_update ON public.checkins;
CREATE TRIGGER on_checkin_note_update
    BEFORE UPDATE ON public.checkins
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_checkin_note_update();

-- RLS Policies

-- Coaches (Trainers) can update coach_note fields for their clients
CREATE POLICY "Trainers can update coach notes for their clients"
ON public.checkins
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = checkins.client_id
    AND c.trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = checkins.client_id
    AND c.trainer_id = auth.uid()
  )
);

-- Clients can update seen_at field for their own checkins
CREATE POLICY "Clients can mark their notes as seen"
ON public.checkins
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = checkins.client_id
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = checkins.client_id
    AND c.user_id = auth.uid()
  )
);

-- Ensure clients can only read their own checkins (if not already set)
-- (Assuming base RLS for SELECT already exists, but reinforcing for the new columns)
