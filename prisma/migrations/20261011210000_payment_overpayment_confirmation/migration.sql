ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "expected_amount" DECIMAL(12,2);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "overpayment_amount" DECIMAL(12,2);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "overpayment_reason" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "overpayment_confirmed_at" TIMESTAMP(3);

UPDATE "payments"
SET "expected_amount" = "amount"
WHERE "expected_amount" IS NULL;
