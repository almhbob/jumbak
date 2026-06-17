-- Add a driver update timestamp used by ride matching round-robin ordering.
-- The default keeps this migration safe for existing Driver rows.
ALTER TABLE "Driver"
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
