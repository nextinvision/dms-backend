/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bytes` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `format` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_DISCUSSION', 'JOB_CARD_IN_PROGRESS', 'CONVERTED', 'LOST');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "AppointmentStatus" ADD VALUE 'ARRIVED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'QUOTATION_CREATED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'SENT_TO_MANAGER';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "arrivalMode" TEXT,
ADD COLUMN     "assignedServiceAdvisor" TEXT,
ADD COLUMN     "assignedTechnician" TEXT,
ADD COLUMN     "batterySerialNumber" TEXT,
ADD COLUMN     "checkInDate" TIMESTAMP(3),
ADD COLUMN     "checkInNotes" TEXT,
ADD COLUMN     "checkInSlipNumber" TEXT,
ADD COLUMN     "checkInTime" TEXT,
ADD COLUMN     "customerArrived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dropAddress" TEXT,
ADD COLUMN     "dropCity" TEXT,
ADD COLUMN     "dropPincode" TEXT,
ADD COLUMN     "dropState" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "estimatedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "estimatedServiceTime" TEXT,
ADD COLUMN     "feedbackRating" INTEGER,
ADD COLUMN     "mcuSerialNumber" TEXT,
ADD COLUMN     "odometerReading" TEXT,
ADD COLUMN     "otherPartSerialNumber" TEXT,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupCity" TEXT,
ADD COLUMN     "pickupDropRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickupPincode" TEXT,
ADD COLUMN     "pickupState" TEXT,
ADD COLUMN     "preferredCommunicationMode" TEXT,
ADD COLUMN     "previousServiceHistory" TEXT,
ADD COLUMN     "technicianObservation" TEXT,
ADD COLUMN     "vcuSerialNumber" TEXT,
ADD COLUMN     "warrantyStatus" TEXT;

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "bytes" INTEGER NOT NULL,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "format" TEXT NOT NULL,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "jobCardId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "publicId" TEXT NOT NULL,
ADD COLUMN     "uploadedBy" TEXT,
ADD COLUMN     "vehicleId" TEXT,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "JobCard" ADD COLUMN     "convertedToFinal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalJobCardId" TEXT,
ADD COLUMN     "isTemporary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "managerReviewNotes" TEXT,
ADD COLUMN     "managerReviewStatus" TEXT,
ADD COLUMN     "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN     "passedToManager" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passedToManagerAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "approvalHistory" JSONB,
ADD COLUMN     "batterySerialNumber" TEXT,
ADD COLUMN     "customNotes" TEXT,
ADD COLUMN     "customerApprovalStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "customerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "customerRejectionReason" TEXT,
ADD COLUMN     "documentType" TEXT NOT NULL DEFAULT 'Quotation',
ADD COLUMN     "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insuranceEndDate" TIMESTAMP(3),
ADD COLUMN     "insuranceStartDate" TIMESTAMP(3),
ADD COLUMN     "insurerId" TEXT,
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "noteTemplateId" TEXT,
ADD COLUMN     "passedToManager" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passedToManagerAt" TIMESTAMP(3),
ADD COLUMN     "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ServiceCenter" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankIFSC" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "homeServiceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoicePrefix" TEXT,
ADD COLUMN     "maxAppointmentsPerDay" INTEGER,
ADD COLUMN     "panNumber" TEXT,
ADD COLUMN     "pinCode" TEXT,
ADD COLUMN     "serviceRadius" DECIMAL(65,30),
ADD COLUMN     "serviceTypes" TEXT[],
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN     "technicianCount" INTEGER;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "inquiryType" TEXT NOT NULL,
    "serviceType" TEXT,
    "source" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "convertedTo" TEXT,
    "convertedId" TEXT,
    "quotationId" TEXT,
    "jobCardId" TEXT,
    "appointmentId" TEXT,
    "notes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "assignedTo" TEXT,
    "serviceCenterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInSlip" (
    "id" TEXT NOT NULL,
    "slipNumber" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "serviceCenterId" TEXT NOT NULL,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkInTime" TEXT NOT NULL,
    "expectedServiceDate" TIMESTAMP(3),
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "vehicleMake" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "notes" TEXT,
    "odometerReading" TEXT,
    "fuelLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInSlip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_leadNumber_key" ON "Lead"("leadNumber");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_serviceCenterId_idx" ON "Lead"("serviceCenterId");

-- CreateIndex
CREATE INDEX "Lead_quotationId_idx" ON "Lead"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInSlip_slipNumber_key" ON "CheckInSlip"("slipNumber");

-- CreateIndex
CREATE INDEX "CheckInSlip_jobCardId_idx" ON "CheckInSlip"("jobCardId");

-- CreateIndex
CREATE INDEX "CheckInSlip_serviceCenterId_idx" ON "CheckInSlip"("serviceCenterId");

-- CreateIndex
CREATE INDEX "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "File_publicId_key" ON "File"("publicId");

-- CreateIndex
CREATE INDEX "File_relatedEntityId_relatedEntityType_idx" ON "File"("relatedEntityId", "relatedEntityType");

-- CreateIndex
CREATE INDEX "File_category_idx" ON "File"("category");

-- CreateIndex
CREATE INDEX "File_publicId_idx" ON "File"("publicId");

-- CreateIndex
CREATE INDEX "File_appointmentId_idx" ON "File"("appointmentId");

-- CreateIndex
CREATE INDEX "File_jobCardId_idx" ON "File"("jobCardId");

-- CreateIndex
CREATE INDEX "File_vehicleId_idx" ON "File"("vehicleId");

-- CreateIndex
CREATE INDEX "File_customerId_idx" ON "File"("customerId");

-- CreateIndex
CREATE INDEX "JobCard_isTemporary_idx" ON "JobCard"("isTemporary");

-- CreateIndex
CREATE INDEX "JobCard_passedToManager_idx" ON "JobCard"("passedToManager");

-- CreateIndex
CREATE INDEX "JobCard_managerId_idx" ON "JobCard"("managerId");

-- CreateIndex
CREATE INDEX "Quotation_customerApprovalStatus_idx" ON "Quotation"("customerApprovalStatus");

-- CreateIndex
CREATE INDEX "Quotation_passedToManager_idx" ON "Quotation"("passedToManager");

-- CreateIndex
CREATE INDEX "Quotation_leadId_idx" ON "Quotation"("leadId");

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_finalJobCardId_fkey" FOREIGN KEY ("finalJobCardId") REFERENCES "JobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInSlip" ADD CONSTRAINT "CheckInSlip_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
