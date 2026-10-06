-- Recibos: a PAID payment is a receipt with a per-company sequential number.
ALTER TABLE "payments" ADD COLUMN "receipt_number" INTEGER;
ALTER TABLE "payments" ADD COLUMN "receipt_signature_key" TEXT;
ALTER TABLE "payments" ADD COLUMN "receipt_signer_name" TEXT;

-- Backfill: number existing paid payments in payment order, per company.
UPDATE "payments" p
SET "receipt_number" = n.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "company_id" ORDER BY COALESCE("paid_at", "created_at"), "created_at", "id"
  ) AS rn
  FROM "payments"
  WHERE "status" = 'PAID'
) n
WHERE p."id" = n."id";

CREATE UNIQUE INDEX "payments_company_id_receipt_number_key" ON "payments"("company_id", "receipt_number");
