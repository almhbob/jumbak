-- Add stops column to Ride for multi-stop open rides (JSON array stored as text)
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "stops" TEXT;
