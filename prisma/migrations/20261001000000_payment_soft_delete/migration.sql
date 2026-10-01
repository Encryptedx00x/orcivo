-- PB1-P29-payment-edit-delete: additive, nullable soft-delete marker.
-- No backfill needed: existing rows stay NULL (not deleted). All reads of
-- Payment must filter deleted_at IS NULL going forward.

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "payments_company_id_deleted_at_idx" ON "payments"("company_id", "deleted_at");
