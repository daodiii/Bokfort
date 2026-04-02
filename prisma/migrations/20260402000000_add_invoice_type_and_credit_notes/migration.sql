-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('INVOICE', 'CREDIT_NOTE');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoiceType" "InvoiceType" NOT NULL DEFAULT 'INVOICE',
ADD COLUMN     "originalInvoiceId" TEXT;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
