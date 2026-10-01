-- PB1-P17: user-specific acknowledgement state for the audit-backed in-app feed.
-- Audit rows remain the source of event text and are never changed by this feature.

CREATE TABLE "notification_reads" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audit_log_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_reads_audit_log_id_user_id_key"
  ON "notification_reads"("audit_log_id", "user_id");
CREATE INDEX "notification_reads_company_id_user_id_idx"
  ON "notification_reads"("company_id", "user_id");

ALTER TABLE "notification_reads"
  ADD CONSTRAINT "notification_reads_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_reads"
  ADD CONSTRAINT "notification_reads_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_reads"
  ADD CONSTRAINT "notification_reads_audit_log_id_fkey"
  FOREIGN KEY ("audit_log_id") REFERENCES "audit_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
