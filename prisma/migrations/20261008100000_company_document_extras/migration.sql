-- Company data printed on quotes and receipts.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "professional_registration" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "document_footer" TEXT;
