DO $$ BEGIN
  CREATE TYPE "StockDepletionEvent" AS ENUM ('QUOTE_APPROVAL', 'WORK_ORDER_COMPLETION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContactSavePreference" AS ENUM ('ALWAYS', 'NEVER', 'ASK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerOrigin" AS ENUM ('INDICATION', 'INSTAGRAM', 'GOOGLE', 'FACEBOOK', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StockMovementType" AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StockMovementEvent" AS ENUM (
    'QUOTE_APPROVAL', 'WORK_ORDER_COMPLETION', 'WORK_ORDER_CANCEL',
    'WORK_ORDER_REOPEN', 'QUOTE_CORRECTION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "stock_depletion_event" "StockDepletionEvent" NOT NULL DEFAULT 'QUOTE_APPROVAL',
  ADD COLUMN IF NOT EXISTS "contact_save_preference" "ContactSavePreference" NOT NULL DEFAULT 'ASK',
  ADD COLUMN IF NOT EXISTS "catalog_name" TEXT NOT NULL DEFAULT 'Catálogo',
  ADD COLUMN IF NOT EXISTS "catalog_units" TEXT[] NOT NULL DEFAULT ARRAY['un', 'h', 'm', 'm²', 'kg', 'l']::TEXT[];

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "origin" "CustomerOrigin",
  ADD COLUMN IF NOT EXISTS "birthday" DATE,
  ADD COLUMN IF NOT EXISTS "internal_notes" TEXT;

ALTER TABLE "catalog_items"
  ADD COLUMN IF NOT EXISTS "internal_code" TEXT,
  ADD COLUMN IF NOT EXISTS "brand" TEXT,
  ADD COLUMN IF NOT EXISTS "margin_percent" DECIMAL(7,3),
  ADD COLUMN IF NOT EXISTS "markup_percent" DECIMAL(7,3);

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_items_company_id_internal_code_key"
  ON "catalog_items"("company_id", "internal_code");

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "catalog_item_id" TEXT NOT NULL,
  "quote_id" TEXT,
  "work_order_id" TEXT,
  "reference_id" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "event" "StockMovementEvent" NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_movements_company_item_event_reference_key"
  ON "stock_movements"("company_id", "catalog_item_id", "event", "reference_id");
CREATE INDEX IF NOT EXISTS "stock_movements_company_item_created_idx"
  ON "stock_movements"("company_id", "catalog_item_id", "created_at");
CREATE INDEX IF NOT EXISTS "stock_movements_company_quote_idx"
  ON "stock_movements"("company_id", "quote_id");
CREATE INDEX IF NOT EXISTS "stock_movements_company_work_order_idx"
  ON "stock_movements"("company_id", "work_order_id");

DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_catalog_item_id_fkey"
    FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_quote_id_fkey"
    FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_work_order_id_fkey"
    FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
