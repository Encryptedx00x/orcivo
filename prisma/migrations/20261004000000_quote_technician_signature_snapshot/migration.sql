-- PB1-P10 follow-up: frozen copy of the technician signature applied at send.
-- Additive, nullable: existing quotes stay NULL (no signature in regenerated PDFs,
-- same as before); the stored sent PDF is untouched.
ALTER TABLE "quotes" ADD COLUMN "technician_signature_key" TEXT;
