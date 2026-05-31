-- Add DriverApplication table to store full compliance fields from driver registration
CREATE TABLE "DriverApplication" (
  "id"               TEXT NOT NULL,
  "driverId"         TEXT,
  "phone"            TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "cityId"           TEXT,
  "vehicleTypeId"    TEXT,
  "plateNo"          TEXT,
  "color"            TEXT,
  "model"            TEXT,
  "nationalId"       TEXT,
  "chassisNo"        TEXT,
  "trafficId"        TEXT,
  "bankAccount"      TEXT,
  "guarantorName"    TEXT,
  "guarantorPhone"   TEXT,
  "guarantorAddress" TEXT,
  "status"           TEXT NOT NULL DEFAULT 'pending_review',
  "complianceStatus" TEXT NOT NULL DEFAULT 'needs_admin_review',
  "freeMonth"        BOOLEAN NOT NULL DEFAULT true,
  "approvedAt"       TIMESTAMP(3),
  "rejectedAt"       TIMESTAMP(3),
  "reviewedBy"       TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DriverApplication_driverId_key" ON "DriverApplication"("driverId");

ALTER TABLE "DriverApplication" ADD CONSTRAINT "DriverApplication_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
