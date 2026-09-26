-- PB1-P14-customer-edit-delete: additive, nullable soft-delete marker.
-- No backfill needed: existing rows stay NULL (not deleted). All reads of
-- Customer must filter deleted_at IS NULL going forward.

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "customers_company_id_deleted_at_idx" ON "customers"("company_id", "deleted_at");
