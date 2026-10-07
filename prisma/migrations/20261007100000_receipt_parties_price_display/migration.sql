-- Company address (receipts/quotes) and how quote prices are shown to the client.
CREATE TYPE "QuotePriceDisplay" AS ENUM ('ITEMS', 'TOTAL', 'NONE');

ALTER TABLE "companies" ADD COLUMN "address" TEXT;
ALTER TABLE "companies" ADD COLUMN "quote_default_price_display" "QuotePriceDisplay" NOT NULL DEFAULT 'ITEMS';
ALTER TABLE "quotes" ADD COLUMN "price_display" "QuotePriceDisplay" NOT NULL DEFAULT 'ITEMS';
