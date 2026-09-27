-- PB1-P15 inventory-lite. Additive only: existing catalog prices are copied to
-- sale_price, existing stock starts at zero, and the default low-stock marker
-- is five units.

-- AlterTable
ALTER TABLE "catalog_items"
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "cost_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "sale_price" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Preserve the customer-facing price of all existing catalog entries.
UPDATE "catalog_items" SET "sale_price" = "unit_price";
