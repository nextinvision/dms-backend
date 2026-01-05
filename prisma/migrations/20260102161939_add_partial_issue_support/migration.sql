-- AlterTable: Add issuedQty and subPoNumber to PartsIssueItem
DO $$ 
BEGIN
    -- Add issuedQty column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PartsIssueItem' AND column_name = 'issuedQty'
    ) THEN
        ALTER TABLE "PartsIssueItem" ADD COLUMN "issuedQty" INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Add subPoNumber column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PartsIssueItem' AND column_name = 'subPoNumber'
    ) THEN
        ALTER TABLE "PartsIssueItem" ADD COLUMN "subPoNumber" TEXT;
    END IF;
END $$;

-- CreateTable: PartsIssueDispatch
CREATE TABLE IF NOT EXISTS "PartsIssueDispatch" (
    "id" TEXT NOT NULL,
    "issueItemId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subPoNumber" TEXT NOT NULL,
    "isFullyFulfilled" BOOLEAN NOT NULL DEFAULT false,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedById" TEXT,
    "transportDetails" JSONB,

    CONSTRAINT "PartsIssueDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PartsIssueDispatch_issueItemId_idx" ON "PartsIssueDispatch"("issueItemId");
CREATE INDEX IF NOT EXISTS "PartsIssueDispatch_issueId_idx" ON "PartsIssueDispatch"("issueId");

-- AddForeignKey
DO $$ 
BEGIN
    -- Add foreign key for issueItemId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'PartsIssueDispatch_issueItemId_fkey'
    ) THEN
        ALTER TABLE "PartsIssueDispatch" ADD CONSTRAINT "PartsIssueDispatch_issueItemId_fkey" 
        FOREIGN KEY ("issueItemId") REFERENCES "PartsIssueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Add foreign key for issueId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'PartsIssueDispatch_issueId_fkey'
    ) THEN
        ALTER TABLE "PartsIssueDispatch" ADD CONSTRAINT "PartsIssueDispatch_issueId_fkey" 
        FOREIGN KEY ("issueId") REFERENCES "PartsIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Add foreign key for dispatchedById if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'PartsIssueDispatch_dispatchedById_fkey'
    ) THEN
        ALTER TABLE "PartsIssueDispatch" ADD CONSTRAINT "PartsIssueDispatch_dispatchedById_fkey" 
        FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

