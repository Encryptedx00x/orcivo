-- Phase 2B: Payment (recebimentos) and Appointment (agenda).
-- Additive only. Brings versioned migrations in line with prisma/schema.prisma.
-- Tenant-scoping constraints for the loose *_id columns are deferred to Phase 03.1-P02.

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'BOLETO', 'CARTAO', 'DINHEIRO', 'TRANSFERENCIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('VISITA', 'INSTALACAO', 'ORCAMENTO', 'MANUTENCAO', 'REUNIAO', 'OUTRO');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "work_order_id" TEXT,
    "quote_id" TEXT,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod",
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "work_order_id" TEXT,
    "title" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'OUTRO',
    "notes" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_company_id_idx" ON "payments"("company_id");

-- CreateIndex
CREATE INDEX "payments_company_id_status_idx" ON "payments"("company_id", "status");

-- CreateIndex
CREATE INDEX "appointments_company_id_idx" ON "appointments"("company_id");

-- CreateIndex
CREATE INDEX "appointments_company_id_starts_at_idx" ON "appointments"("company_id", "starts_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
