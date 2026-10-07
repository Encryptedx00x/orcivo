-- Costs of the business (R4).
DO $$ BEGIN
  CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "quote_id" TEXT,
  "work_order_id" TEXT,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "PaymentMethod",
  "status" "ExpenseStatus" NOT NULL DEFAULT 'PAID',
  "due_date" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "expenses_company_id_deleted_at_idx" ON "expenses"("company_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "expenses_company_id_work_order_id_idx" ON "expenses"("company_id", "work_order_id");
DO $$ BEGIN
  ALTER TABLE "expenses" ADD CONSTRAINT "expenses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
