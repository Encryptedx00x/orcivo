ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "salutation" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "salutation_custom" TEXT;

ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "industry_code" TEXT,
  ADD COLUMN IF NOT EXISTS "industry_other" TEXT,
  ADD COLUMN IF NOT EXISTS "onboarding_goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "service_owner_term" TEXT NOT NULL DEFAULT 'Responsável',
  ADD COLUMN IF NOT EXISTS "document_professional_term" TEXT;

ALTER TABLE "company_members"
  ADD COLUMN IF NOT EXISTS "profession_title" TEXT;

ALTER TABLE "quotes"
  ADD COLUMN IF NOT EXISTS "service_owner_term_snapshot" TEXT NOT NULL DEFAULT 'Responsável pelo serviço',
  ADD COLUMN IF NOT EXISTS "signature_label_snapshot" TEXT NOT NULL DEFAULT 'Assinatura';

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "receipt_signature_label" TEXT;
