-- Condições padrão: text and validity prefilled on new quotes (nullable = app default).
ALTER TABLE "companies" ADD COLUMN "quote_default_terms" TEXT;
ALTER TABLE "companies" ADD COLUMN "quote_default_validity_days" INTEGER;
