-- First, let's find duplicate phone numbers
SELECT phone, COUNT(*) as count
FROM "Customer"
WHERE "deletedAt" IS NULL
GROUP BY phone
HAVING COUNT(*) > 1;

-- For each duplicate, keep the oldest record and mark others as deleted
-- You should review these before running! This is a safeguard query.
-- To execute: Run this in your database admin tool or use Prisma Studio

-- Example cleanup (DO NOT RUN without reviewing your data first):
-- UPDATE "Customer" 
-- SET "deletedAt" = NOW()
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, phone, 
--            ROW_NUMBER() OVER (PARTITION BY phone ORDER BY "createdAt" ASC) as rn
--     FROM "Customer"
--     WHERE "deletedAt" IS NULL
--   ) t
--   WHERE rn > 1
-- );
