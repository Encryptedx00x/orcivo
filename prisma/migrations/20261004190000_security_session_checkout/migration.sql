-- Preserve existing sessions while giving each browser a stable rotation family.
ALTER TABLE "refresh_tokens" ADD COLUMN "session_id" TEXT;
UPDATE "refresh_tokens" SET "session_id" = "id" WHERE "session_id" IS NULL;
ALTER TABLE "refresh_tokens" ALTER COLUMN "session_id" SET NOT NULL;
-- Keep token issuance compatible while the previous application image is replaced.
ALTER TABLE "refresh_tokens" ALTER COLUMN "session_id" SET DEFAULT gen_random_uuid()::text;

-- A pending checkout is not an entitlement or a paid subscription.
ALTER TABLE "subscriptions"
  ADD COLUMN "pending_provider_id" TEXT,
  ADD COLUMN "pending_plan_code" "PlanCode";
