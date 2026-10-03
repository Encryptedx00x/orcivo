-- AlterTable
ALTER TABLE "subscription_payments" ADD COLUMN     "pix_expires_at" TIMESTAMP(3),
ADD COLUMN     "pix_qr_code" TEXT,
ADD COLUMN     "pix_qr_code_base64" TEXT,
ADD COLUMN     "pix_ticket_url" TEXT;
