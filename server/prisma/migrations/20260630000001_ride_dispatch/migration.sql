-- AlterTable "User" — passenger suspension/cancellation tracking
ALTER TABLE "User" ADD COLUMN "dailyCancellations"   INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastCancellationDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspendedUntil"       TIMESTAMP(3);

-- AlterTable "Driver" — driver rejection/suspension/violation tracking
ALTER TABLE "Driver" ADD COLUMN "dailyRejections"   INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE "Driver" ADD COLUMN "lastRejectionDate" TIMESTAMP(3);
ALTER TABLE "Driver" ADD COLUMN "suspendedUntil"    TIMESTAMP(3);
ALTER TABLE "Driver" ADD COLUMN "violationCount"    INTEGER      NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable "RideOffer" — per-driver dispatch records
CREATE TABLE "RideOffer" (
    "id"          TEXT         NOT NULL,
    "rideId"      TEXT         NOT NULL,
    "driverId"    TEXT         NOT NULL,
    "status"      "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "offeredAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "RideOffer_pkey" PRIMARY KEY ("id")
);

-- UniqueConstraint: one offer per driver per ride
CREATE UNIQUE INDEX "RideOffer_rideId_driverId_key" ON "RideOffer"("rideId", "driverId");

-- AddForeignKey
ALTER TABLE "RideOffer" ADD CONSTRAINT "RideOffer_rideId_fkey"
    FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RideOffer" ADD CONSTRAINT "RideOffer_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
