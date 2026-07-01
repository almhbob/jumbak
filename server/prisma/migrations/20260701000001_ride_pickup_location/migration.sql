-- AddColumn: pickup lat/lng on Ride for nearest-driver dispatch
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupLat" DOUBLE PRECISION;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupLng" DOUBLE PRECISION;
