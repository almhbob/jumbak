-- CreateTable "PlatformSetting" — configurable key-value store for admin-adjustable parameters
CREATE TABLE "PlatformSetting" (
    "key"       TEXT         NOT NULL,
    "value"     TEXT         NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- Seed default dispatch/penalty settings
INSERT INTO "PlatformSetting" ("key", "value", "updatedAt") VALUES
    ('dispatch.dailyRejectionLimit',          '2',  NOW()),
    ('dispatch.suspensionHoursFirst',         '12', NOW()),
    ('dispatch.suspensionHoursDriverRepeat',  '24', NOW()),
    ('dispatch.walletDeductionSDG',           '50', NOW()),
    ('dispatch.dailyCancellationLimit',       '2',  NOW()),
    ('dispatch.suspensionHoursPassengerFirst', '12', NOW()),
    ('dispatch.suspensionHoursPassengerRepeat','48', NOW()),
    ('dispatch.offerTimeoutSeconds',          '60', NOW())
ON CONFLICT ("key") DO NOTHING;
