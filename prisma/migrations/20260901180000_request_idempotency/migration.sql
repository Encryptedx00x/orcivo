-- P02-T11: request idempotency for mobile mutations (X-Client-Request-Id).
-- Additive. Applying to a persistent DB is P02-T12 (HUMAN_APPROVAL).

-- CreateTable
CREATE TABLE "request_idempotency" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status_code" INTEGER,
    "response_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "request_idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_idempotency_company_id_idx" ON "request_idempotency"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "request_idempotency_company_id_key_key" ON "request_idempotency"("company_id", "key");

-- AddForeignKey
ALTER TABLE "request_idempotency" ADD CONSTRAINT "request_idempotency_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
