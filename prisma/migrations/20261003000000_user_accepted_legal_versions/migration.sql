-- L2-P04: versão dos Termos de Uso / Política de Privacidade aceitos no signup.
-- Additive only: colunas NOT NULL com default, então linhas existentes e clientes
-- antigos (que não enviam versão) continuam válidos. A data do aceite já é users.accepted_terms_at.
ALTER TABLE "users" ADD COLUMN "accepted_terms_version" TEXT NOT NULL DEFAULT 'pre-versioning';
ALTER TABLE "users" ADD COLUMN "accepted_privacy_version" TEXT NOT NULL DEFAULT 'pre-versioning';
