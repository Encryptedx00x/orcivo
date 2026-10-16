CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "active_company_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "refresh_tokens"
  ADD COLUMN IF NOT EXISTS "auth_session_id" TEXT;

CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx"
  ON "auth_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "auth_sessions_active_company_id_idx"
  ON "auth_sessions"("active_company_id");
CREATE INDEX IF NOT EXISTS "refresh_tokens_auth_session_id_idx"
  ON "refresh_tokens"("auth_session_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_user_id_fkey') THEN
    ALTER TABLE "auth_sessions"
      ADD CONSTRAINT "auth_sessions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_active_company_id_fkey'
  ) THEN
    ALTER TABLE "auth_sessions"
      ADD CONSTRAINT "auth_sessions_active_company_id_fkey"
      FOREIGN KEY ("active_company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_auth_session_id_fkey'
  ) THEN
    ALTER TABLE "refresh_tokens"
      ADD CONSTRAINT "refresh_tokens_auth_session_id_fkey"
      FOREIGN KEY ("auth_session_id") REFERENCES "auth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
