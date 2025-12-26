/*
  Warnings:

  - The values [HOME] on the enum `AppointmentLocation` will be removed. If these variants are still used in the database, this will fail.
  - The values [MEDIUM] on the enum `JobCardPriority` will be removed. If these variants are still used in the database, this will fail.
  - The values [SENT,APPROVED,REJECTED] on the enum `QuotationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `part1Data` on the `JobCard` table. All the data in the column will be lost.
  - You are about to drop the column `part2AData` on the `JobCard` table. All the data in the column will be lost.
  - You are about to drop the column `part3Data` on the `JobCard` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AppointmentLocation_new" AS ENUM ('STATION', 'DOORSTEP');
ALTER TABLE "Appointment" ALTER COLUMN "location" DROP DEFAULT;
ALTER TABLE "JobCard" ALTER COLUMN "location" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "location" TYPE "AppointmentLocation_new" USING ("location"::text::"AppointmentLocation_new");
ALTER TABLE "JobCard" ALTER COLUMN "location" TYPE "AppointmentLocation_new" USING ("location"::text::"AppointmentLocation_new");
ALTER TYPE "AppointmentLocation" RENAME TO "AppointmentLocation_old";
ALTER TYPE "AppointmentLocation_new" RENAME TO "AppointmentLocation";
DROP TYPE "AppointmentLocation_old";
ALTER TABLE "Appointment" ALTER COLUMN "location" SET DEFAULT 'STATION';
ALTER TABLE "JobCard" ALTER COLUMN "location" SET DEFAULT 'STATION';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "JobCardPriority_new" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
ALTER TABLE "JobCard" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "PartsIssue" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "PartsRequest" ALTER COLUMN "urgency" DROP DEFAULT;
ALTER TABLE "JobCard" ALTER COLUMN "priority" TYPE "JobCardPriority_new" USING ("priority"::text::"JobCardPriority_new");
ALTER TABLE "PartsRequest" ALTER COLUMN "urgency" TYPE "JobCardPriority_new" USING ("urgency"::text::"JobCardPriority_new");
ALTER TABLE "PartsIssue" ALTER COLUMN "priority" TYPE "JobCardPriority_new" USING ("priority"::text::"JobCardPriority_new");
ALTER TYPE "JobCardPriority" RENAME TO "JobCardPriority_old";
ALTER TYPE "JobCardPriority_new" RENAME TO "JobCardPriority";
DROP TYPE "JobCardPriority_old";
ALTER TABLE "JobCard" ALTER COLUMN "priority" SET DEFAULT 'NORMAL';
ALTER TABLE "PartsIssue" ALTER COLUMN "priority" SET DEFAULT 'NORMAL';
ALTER TABLE "PartsRequest" ALTER COLUMN "urgency" SET DEFAULT 'NORMAL';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobCardStatus" ADD VALUE 'ARRIVAL_PENDING';
ALTER TYPE "JobCardStatus" ADD VALUE 'JOB_CARD_PENDING_VEHICLE';
ALTER TYPE "JobCardStatus" ADD VALUE 'JOB_CARD_ACTIVE';
ALTER TYPE "JobCardStatus" ADD VALUE 'CHECK_IN_ONLY';
ALTER TYPE "JobCardStatus" ADD VALUE 'NO_RESPONSE_LEAD';
ALTER TYPE "JobCardStatus" ADD VALUE 'MANAGER_QUOTE';
ALTER TYPE "JobCardStatus" ADD VALUE 'AWAITING_QUOTATION_APPROVAL';

-- AlterEnum
BEGIN;
CREATE TYPE "QuotationStatus_new" AS ENUM ('DRAFT', 'SENT_TO_CUSTOMER', 'CUSTOMER_APPROVED', 'CUSTOMER_REJECTED', 'SENT_TO_MANAGER', 'MANAGER_APPROVED', 'MANAGER_REJECTED', 'NO_RESPONSE_LEAD', 'MANAGER_QUOTE');
ALTER TABLE "Quotation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Quotation" ALTER COLUMN "status" TYPE "QuotationStatus_new" USING ("status"::text::"QuotationStatus_new");
ALTER TYPE "QuotationStatus" RENAME TO "QuotationStatus_old";
ALTER TYPE "QuotationStatus_new" RENAME TO "QuotationStatus";
DROP TYPE "QuotationStatus_old";
ALTER TABLE "Quotation" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "JobCard" DROP COLUMN "part1Data",
DROP COLUMN "part2AData",
DROP COLUMN "part3Data",
ADD COLUMN     "part1" JSONB,
ADD COLUMN     "part2A" JSONB,
ADD COLUMN     "part3" JSONB,
ALTER COLUMN "priority" SET DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "PartsIssue" ALTER COLUMN "priority" SET DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "PartsRequest" ALTER COLUMN "urgency" SET DEFAULT 'NORMAL';
