-- PB1-P02-audit-service — ADR-015: central AuditService, additive actor_user_id.
-- Additive + nullable: existing rows (and SYSTEM/CUSTOMER actors going
-- forward) simply keep NULL here. No backfill needed. No FK to "users" —
-- the audit trail must survive a deleted/deactivated member.
-- Applying to a persistent DB is P02-T12 (HUMAN_APPROVAL).

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "actor_user_id" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_company_id_actor_user_id_idx" ON "audit_logs"("company_id", "actor_user_id");
