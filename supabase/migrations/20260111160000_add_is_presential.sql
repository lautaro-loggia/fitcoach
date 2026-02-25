ALTER TABLE "public"."assigned_workouts"
ADD COLUMN IF NOT EXISTS "is_presential" boolean DEFAULT false;
