-- R5b: status extras da OS — AWAITING_PAYMENT e WARRANTY, opt-in por empresa.
-- Idempotente: seguro reexecutar (ADD VALUE IF NOT EXISTS / duplicate_object / IF NOT EXISTS).
ALTER TYPE "WorkOrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';
ALTER TYPE "WorkOrderStatus" ADD VALUE IF NOT EXISTS 'WARRANTY';

DO $$
BEGIN
  CREATE TYPE "WorkOrderExtraStatus" AS ENUM ('AWAITING_PAYMENT', 'WARRANTY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "work_order_statuses" "WorkOrderExtraStatus"[] NOT NULL DEFAULT ARRAY[]::"WorkOrderExtraStatus"[];
