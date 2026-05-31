-- Add category field to Zone model
ALTER TABLE "Zone" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'مرافق ومعالم';
