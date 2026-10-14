ALTER TABLE "companies"
ADD COLUMN IF NOT EXISTS "receipt_default_doc_options" JSONB;

ALTER TABLE "quote_items"
ADD COLUMN IF NOT EXISTS "item_type" "CatalogItemType" NOT NULL DEFAULT 'SERVICE',
ADD COLUMN IF NOT EXISTS "unit" TEXT;

UPDATE "quote_items" AS qi
SET
  "item_type" = ci."type",
  "unit" = COALESCE(qi."unit", ci."unit", 'un')
FROM "catalog_items" AS ci
WHERE qi."catalog_item_id" = ci."id"
  AND qi."company_id" = ci."company_id";

UPDATE "quote_items"
SET "unit" = 'un'
WHERE "unit" IS NULL;

ALTER TABLE "quotes"
ADD COLUMN IF NOT EXISTS "service_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "product_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "quotes" AS q
SET
  "service_subtotal" = totals."service_subtotal",
  "product_subtotal" = totals."product_subtotal"
FROM (
  SELECT
    "quote_id",
    COALESCE(SUM("total") FILTER (WHERE "item_type" = 'SERVICE'), 0) AS "service_subtotal",
    COALESCE(SUM("total") FILTER (WHERE "item_type" = 'PRODUCT'), 0) AS "product_subtotal"
  FROM "quote_items"
  GROUP BY "quote_id"
) AS totals
WHERE q."id" = totals."quote_id";

ALTER TABLE "payments"
ADD COLUMN IF NOT EXISTS "receipt_doc_options" JSONB,
ADD COLUMN IF NOT EXISTS "receipt_additional_info" TEXT;
