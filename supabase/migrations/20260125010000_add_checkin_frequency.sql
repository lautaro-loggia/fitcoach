-- Add check-in frequency and next date to clients
ALTER TABLE "public"."clients" 
ADD COLUMN "checkin_frequency_days" integer DEFAULT NULL,
ADD COLUMN "next_checkin_date" date DEFAULT NULL;

COMMENT ON COLUMN "public"."clients"."checkin_frequency_days" IS 'Intervalo en días para realizar check-ins (e.g. 7, 14, 30)';
COMMENT ON COLUMN "public"."clients"."next_checkin_date" IS 'Fecha exacta habilitada para el próximo check-in';
