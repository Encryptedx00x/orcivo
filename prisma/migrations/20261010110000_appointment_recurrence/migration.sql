DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM ('UNCONFIRMED', 'SCHEDULED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AppointmentPeriod" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'BUSINESS_HOURS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AppointmentRecurrence" AS ENUM ('WEEKLY', 'MONTHLY', 'CUSTOM_MONTHS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN IF NOT EXISTS "schedule_period" "AppointmentPeriod",
  ADD COLUMN IF NOT EXISTS "reminder_minutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "reminder_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recurrence_type" "AppointmentRecurrence",
  ADD COLUMN IF NOT EXISTS "recurrence_interval" INTEGER,
  ADD COLUMN IF NOT EXISTS "recurrence_series_id" TEXT,
  ADD COLUMN IF NOT EXISTS "recurrence_next_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recurrence_amount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "recurrence_active" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "appointments_company_id_recurrence_active_recurrence_next_at_idx"
  ON "appointments"("company_id", "recurrence_active", "recurrence_next_at");

CREATE UNIQUE INDEX IF NOT EXISTS "appointments_company_id_recurrence_series_id_starts_at_key"
  ON "appointments"("company_id", "recurrence_series_id", "starts_at");
