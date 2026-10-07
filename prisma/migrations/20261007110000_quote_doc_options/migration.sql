-- Price display becomes a set of document options (title + what is shown).
ALTER TABLE "quotes" DROP COLUMN "price_display";
ALTER TABLE "quotes" ADD COLUMN "doc_options" JSONB;
ALTER TABLE "companies" DROP COLUMN "quote_default_price_display";
ALTER TABLE "companies" ADD COLUMN "quote_default_doc_options" JSONB;
DROP TYPE "QuotePriceDisplay";
