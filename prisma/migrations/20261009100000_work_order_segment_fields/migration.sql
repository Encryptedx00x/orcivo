-- Segment fields on work orders (R5): company picks which ones to use.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "work_order_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "details" JSONB;
