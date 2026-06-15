ALTER TABLE "VehicleType" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
UPDATE "VehicleType" SET "isVisible" = false WHERE id IN ('car', 'van');
