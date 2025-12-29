-- AddPart2FieldToJobCard Migration
-- This adds the part2 JSON field to store Part 2 items data

ALTER TABLE "JobCard" ADD COLUMN IF NOT EXISTS "part2" JSONB;
