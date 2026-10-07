-- Structured payment terms and warranty on quotes, with company defaults.
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "payment_terms" JSONB;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "warranty" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "quote_default_payment_terms" JSONB;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "quote_default_warranty" TEXT;
