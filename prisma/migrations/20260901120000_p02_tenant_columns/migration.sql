-- P02-T07: add company_id to quote_items and quote_approvals.
-- CLAUDE.md invariant: every business table carries company_id. These two were
-- the only tenant-scoped tables missing it (see 03.1-P02-T01-ACCESS-MATRIX.md).
-- Additive + backfilled from the parent quote (every row has one via the
-- existing quote_id FK). Applying to a persistent DB is P02-T12 (HUMAN_APPROVAL).

-- quote_items
ALTER TABLE "quote_items" ADD COLUMN "company_id" TEXT;
UPDATE "quote_items" qi
  SET "company_id" = q."company_id"
  FROM "quotes" q
  WHERE q."id" = qi."quote_id";
ALTER TABLE "quote_items" ALTER COLUMN "company_id" SET NOT NULL;

-- quote_approvals
ALTER TABLE "quote_approvals" ADD COLUMN "company_id" TEXT;
UPDATE "quote_approvals" qa
  SET "company_id" = q."company_id"
  FROM "quotes" q
  WHERE q."id" = qa."quote_id";
ALTER TABLE "quote_approvals" ALTER COLUMN "company_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "quote_items_company_id_idx" ON "quote_items"("company_id");
CREATE INDEX "quote_approvals_company_id_idx" ON "quote_approvals"("company_id");

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_approvals" ADD CONSTRAINT "quote_approvals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
