/*
  Warnings:

  - You are about to drop the column `batterySerialNumber` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `feedbackRating` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `mcuSerialNumber` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `otherPartSerialNumber` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `technicianObservation` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `vcuSerialNumber` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `warrantyStatus` on the `Appointment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "batterySerialNumber",
DROP COLUMN "feedbackRating",
DROP COLUMN "mcuSerialNumber",
DROP COLUMN "otherPartSerialNumber",
DROP COLUMN "technicianObservation",
DROP COLUMN "vcuSerialNumber",
DROP COLUMN "warrantyStatus";
