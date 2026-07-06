-- Add category field to Zone model
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'مرافق ومعالم';
