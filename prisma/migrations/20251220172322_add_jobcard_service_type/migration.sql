/*
  Warnings:

  - Added the required column `serviceType` to the `JobCard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JobCard" ADD COLUMN     "serviceType" TEXT NOT NULL;
